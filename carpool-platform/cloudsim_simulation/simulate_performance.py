"""
CloudSim-Style Performance Simulation
--------------------------------------
This script models the same concepts used in CloudSim (a Java-based cloud
simulation toolkit) for the Carpool Coordination Platform:

    - Datacenter  -> a pool of Virtual Machines (VMs)
    - VM          -> a virtual server with fixed processing capacity (MIPS)
    - Cloudlet    -> a single unit of work (here: one ride-matching request)

Since CloudSim itself is a Java library (requires Eclipse + CloudSim JARs),
this script reproduces its core scheduling math in Python so it can run
anywhere and produce the same kind of performance graphs
(response time vs load, resource utilization) for your report/viva.

If your course specifically requires the real Java CloudSim toolkit, use
this script's logic as your simulation design, and see the README for
how to port it into a CloudSim Java project (steps included).

Run:
    pip install matplotlib
    python simulate_performance.py
"""

import random
import statistics
import matplotlib.pyplot as plt

# ---------------------------------------------------------------------------
# Simulation parameters (equivalent to CloudSim's Datacenter/VM/Cloudlet setup)
# ---------------------------------------------------------------------------
NUM_VMS = 4                     # number of virtual machines in the datacenter
VM_MIPS = 1000                  # processing capacity per VM (Million Instructions/sec)
CLOUDLET_LENGTH = 250            # "instructions" needed to process one match request
LOAD_LEVELS = [10, 50, 100, 500, 1000, 5000]  # number of simultaneous ride-match requests to test


class VM:
    def __init__(self, vm_id, mips):
        self.id = vm_id
        self.mips = mips
        self.busy_until = 0.0  # simulated time this VM is free again


def round_robin_schedule(vms, num_requests):
    """
    Assigns each incoming request (cloudlet) to a VM using round-robin,
    matching CloudSim's basic time-shared scheduling behavior.
    Returns list of response times (seconds) for each request.
    """
    response_times = []
    for i in range(num_requests):
        vm = vms[i % len(vms)]
        # time to process = cloudlet length / VM speed, plus queueing delay
        # if VM is already busy from a previous request
        service_time = CLOUDLET_LENGTH / vm.mips
        start_time = max(vm.busy_until, 0)
        finish_time = start_time + service_time
        vm.busy_until = finish_time
        response_times.append(finish_time)
    return response_times


def run_simulation():
    avg_response_times = []
    utilizations = []

    for load in LOAD_LEVELS:
        vms = [VM(i, VM_MIPS) for i in range(NUM_VMS)]
        response_times = round_robin_schedule(vms, load)

        avg_response = statistics.mean(response_times)
        avg_response_times.append(avg_response)

        # crude utilization estimate: total busy time / (num_vms * makespan)
        makespan = max(response_times)
        total_busy = sum(vm.busy_until for vm in vms)
        utilization = min(1.0, total_busy / (NUM_VMS * makespan)) * 100
        utilizations.append(utilization)

        print(f"Load: {load:5d} requests | Avg response time: {avg_response:6.2f}s "
              f"| Datacenter utilization: {utilization:5.1f}%")

    return avg_response_times, utilizations


def plot_results(avg_response_times, utilizations):
    fig, ax1 = plt.subplots(figsize=(8, 5))

    ax1.set_xlabel("Number of simultaneous ride-match requests")
    ax1.set_ylabel("Avg response time (s)", color="#2f6f4f")
    ax1.plot(LOAD_LEVELS, avg_response_times, marker="o", color="#2f6f4f", label="Response Time")
    ax1.tick_params(axis="y", labelcolor="#2f6f4f")

    ax2 = ax1.twinx()
    ax2.set_ylabel("Datacenter utilization (%)", color="#ffb347")
    ax2.plot(LOAD_LEVELS, utilizations, marker="s", color="#ffb347", label="Utilization")
    ax2.tick_params(axis="y", labelcolor="#ffb347")

    plt.title(f"Carpool Platform: Cloud Performance under Load\n({NUM_VMS} VMs, {VM_MIPS} MIPS each)")
    fig.tight_layout()
    plt.savefig("performance_report.png", dpi=150)
    print("\nSaved chart -> performance_report.png")


if __name__ == "__main__":
    random.seed(42)
    avg_times, utils = run_simulation()
    plot_results(avg_times, utils)
