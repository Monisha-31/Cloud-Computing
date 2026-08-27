/*
 * PartitionCompactionSimulation.java
 *
 * Models the data lake's compaction pipeline as a CloudSim scheduling problem:
 * each "partition that needs compacting" becomes a Cloudlet (a unit of work),
 * and a small simulated datacenter of VMs processes them. This lets you report
 * on execution time and resource utilization the way you would for a real
 * distributed compaction job running across a cluster — without needing an
 * actual cluster.
 *
 * This is a SEPARATE program from the Node.js web app (backend/frontend) —
 * CloudSim is a Java toolkit, so it runs on its own in Eclipse/IntelliJ.
 * See README.md in this folder for how to set it up and run it.
 */

import org.cloudbus.cloudsim.*;
import org.cloudbus.cloudsim.core.CloudSim;
import org.cloudbus.cloudsim.provisioners.*;

import java.text.DecimalFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.LinkedList;
import java.util.List;

public class PartitionCompactionSimulation {

    private static List<Cloudlet> cloudletList;
    private static List<Vm> vmList;

    public static void main(String[] args) {
        try {
            int numUsers = 1;
            Calendar calendar = Calendar.getInstance();
            boolean traceFlag = false;

            // 1. Initialize the CloudSim engine
            CloudSim.init(numUsers, calendar, traceFlag);

            // 2. Create a Datacenter representing the compute cluster
            //    that would run the real compaction jobs
            Datacenter datacenter0 = createDatacenter("Datacenter_0");

            // 3. Create a Broker — submits cloudlets (jobs) to VMs on our behalf
            DatacenterBroker broker = createBroker();
            int brokerId = broker.getId();

            // 4. Create VMs — think of each as one worker node in the compaction cluster
            vmList = new ArrayList<>();
            int vmCount = 3; // simulate a 3-node compaction cluster
            for (int i = 0; i < vmCount; i++) {
                Vm vm = new Vm(
                        i, brokerId,
                        1000,   // MIPS — processing speed
                        1,      // number of CPUs
                        2048,   // RAM (MB)
                        1000,   // bandwidth
                        10000,  // storage
                        "Xen",
                        new CloudletSchedulerTimeShared()
                );
                vmList.add(vm);
            }
            broker.submitVmList(vmList);

            // 5. Create Cloudlets — each one represents compacting ONE partition.
            //    "length" is scaled roughly by how many small files + records
            //    that partition holds (more files/records = more CPU work to merge).
            cloudletList = new ArrayList<>();
            UtilizationModel utilizationModel = new UtilizationModelFull();

            // Example partitions, matching the kind of data the web app's
            // pipeline would report as "needing compaction" (fileCount >= threshold).
            // Replace these with real numbers copied from your dashboard's
            // Partitions tab for an accurate simulation of your own run.
            int[] partitionFileCounts = { 5, 4, 6, 3, 7 }; // files per partition
            int[] partitionRecordCounts = { 100, 80, 120, 60, 140 }; // records per partition

            for (int i = 0; i < partitionFileCounts.length; i++) {
                long length = 2000L * partitionFileCounts[i] + 20L * partitionRecordCounts[i];
                Cloudlet cloudlet = new Cloudlet(
                        i, length,
                        1,          // pesNumber
                        300,        // fileSize
                        300,        // outputSize
                        utilizationModel, utilizationModel, utilizationModel
                );
                cloudlet.setUserId(brokerId);
                cloudlet.setVmId(i % vmCount); // round-robin assignment across the 3 VMs
                cloudletList.add(cloudlet);
            }
            broker.submitCloudletList(cloudletList);

            // 6. Run the simulation
            CloudSim.startSimulation();
            List<Cloudlet> resultList = broker.getCloudletReceivedList();
            CloudSim.stopSimulation();

            // 7. Print a report — execution time per partition-compaction job
            printResults(resultList);

        } catch (Exception e) {
            e.printStackTrace();
            System.out.println("Simulation encountered an error.");
        }
    }

    private static Datacenter createDatacenter(String name) throws Exception {
        List<Pe> peList = new ArrayList<>();
        peList.add(new Pe(0, new PeProvisionerSimple(1000)));

        List<Host> hostList = new ArrayList<>();
        int hostId = 0;
        int ram = 8192;
        long storage = 1000000;
        int bw = 10000;

        hostList.add(
                new Host(
                        hostId,
                        new RamProvisionerSimple(ram),
                        new BwProvisionerSimple(bw),
                        storage,
                        peList,
                        new VmSchedulerTimeShared(peList)
                )
        );

        String arch = "x86";
        String os = "Linux";
        String vmm = "Xen";
        double timeZone = 5.5;
        double costPerSec = 3.0;
        double costPerMem = 0.05;
        double costPerStorage = 0.001;
        double costPerBw = 0.0;
        LinkedList<Storage> storageList = new LinkedList<>();

        DatacenterCharacteristics characteristics = new DatacenterCharacteristics(
                arch, os, vmm, hostList, timeZone, costPerSec, costPerMem, costPerStorage, costPerBw
        );

        return new Datacenter(
                name, characteristics, new VmAllocationPolicySimple(hostList), storageList, 0
        );
    }

    private static DatacenterBroker createBroker() throws Exception {
        return new DatacenterBroker("Broker_0");
    }

    private static void printResults(List<Cloudlet> list) {
        DecimalFormat df = new DecimalFormat("###.##");
        System.out.println();
        System.out.println("=========== COMPACTION JOB SIMULATION RESULTS ===========");
        System.out.printf("%-12s%-10s%-10s%-14s%-14s%-14s%n",
                "Cloudlet ID", "STATUS", "VM ID", "Start Time", "Finish Time", "Duration");

        double totalDuration = 0;
        for (Cloudlet cloudlet : list) {
            String status = cloudlet.getCloudletStatusString();
            double duration = cloudlet.getFinishTime() - cloudlet.getExecStartTime();
            totalDuration += duration;
            System.out.printf("%-12d%-10s%-10d%-14s%-14s%-14s%n",
                    cloudlet.getCloudletId(),
                    status,
                    cloudlet.getVmId(),
                    df.format(cloudlet.getExecStartTime()),
                    df.format(cloudlet.getFinishTime()),
                    df.format(duration));
        }

        System.out.println("===========================================================");
        System.out.println("Total simulated partitions compacted: " + list.size());
        System.out.println("Average job duration: " + df.format(totalDuration / list.size()));
        System.out.println("===========================================================");
    }
}
