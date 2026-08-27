# CloudSim Simulation — Partition Compaction Scheduling

This is a **separate Java program** from the main web app. CloudSim is a Java-based
cloud simulation toolkit — it models a virtual datacenter (hosts, VMs, and jobs called
"Cloudlets") so you can study scheduling and resource utilization without needing a
real cluster. Here, each Cloudlet represents "compacting one partition," and the
simulation reports how long each job took and how work was spread across 3 simulated
worker VMs.

This models the same core scenario as the Node.js app's `runCompaction()` function —
you're just simulating a *distributed* version of it (multiple VMs handling multiple
partitions in parallel), which is where CloudSim's scheduling models add real value.

## Setup (Eclipse)

1. **Download CloudSim.** Get `cloudsim-3.0.3` (or similar 3.x release) from
   https://github.com/Cloudslab/cloudsim/releases — download the `-bin` or `-full` package,
   which includes the required JARs (`cloudsim-3.0.3.jar` and `cloudsim-examples-3.0.3.jar`,
   plus dependencies like `commons-math3`).
2. **Create a new Java Project** in Eclipse (or IntelliJ): `File → New → Java Project`.
3. **Add the CloudSim JARs to your build path:**
   Right-click the project → `Build Path → Configure Build Path → Libraries → Add External JARs`
   → select the CloudSim JAR(s) you downloaded.
4. **Copy `PartitionCompactionSimulation.java`** into your project's `src` folder.
5. **Run it:** right-click the file → `Run As → Java Application`.

## Setup (IntelliJ)

1. `File → New → Project` → Java.
2. `File → Project Structure → Libraries → +` → add the CloudSim JAR(s).
3. Copy `PartitionCompactionSimulation.java` into `src`.
4. Right-click the file → `Run 'PartitionCompactionSimulation.main()'`.

## What the numbers mean

The `partitionFileCounts` and `partitionRecordCounts` arrays near the top of `main()`
are sample data — **replace them with real numbers from your own pipeline run**
(open the web app's Partitions tab, note the file counts for partitions flagged
"Needs Compaction") so the simulation reflects your actual test data for the report.

The output table shows, per simulated compaction job (Cloudlet):
- which VM (worker node) it was scheduled on
- start time / finish time / duration (in simulated seconds)

Followed by a summary: total jobs compacted and average job duration — useful numbers
to compare against different VM counts or job "lengths" (try changing `vmCount` from
3 to 1 or 5 and re-running, to show how parallelism affects total pipeline time in
your report).

## Why this is separate from the main app

The web app (Node.js/Express/MongoDB) actually runs the real partitioning and
compaction logic on real files. CloudSim, by contrast, is a *simulation* tool used
to model and reason about how that kind of workload would behave at a larger,
distributed scale — the two are complementary but built with different tech stacks
(JavaScript vs. Java), so they're kept as separate deliverables.
