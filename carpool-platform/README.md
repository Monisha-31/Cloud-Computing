# Cloud-Based Carpool Coordination Platform

A web application that connects **drivers** and **riders** travelling on similar
routes and at similar times, built and deployed using cloud computing tools.

## Project Structure
```
carpool-platform/
├── app.py                     # Flask backend (matching logic, routes, API)
├── templates/                 # HTML pages (home, driver, rider)
├── requirements.txt
├── Dockerfile                 # Containerizes the app
├── docker-compose.yml         # One-command local run
└── cloudsim_simulation/
    └── simulate_performance.py   # CloudSim-style performance analysis
```

## 1. Run Locally (no Docker)
```bash
pip install -r requirements.txt
python app.py
```
Visit **http://localhost:5000**

- `/driver` — post a ride (source, destination, time, seats)
- `/rider` — search for a matching ride and book a seat
- `/api/match` — JSON API for the matching engine
- `/health` — health check endpoint

---

## 2. Docker — Containerizing the Application
Docker packages the app with all its dependencies so it runs identically
everywhere.

```bash
# Build the image
docker build -t carpool-app .

# Run the container
docker run -p 5000:5000 carpool-app
```
Or with Docker Compose:
```bash
docker-compose up --build
```
Visit **http://localhost:5000** — same app, now running inside a container.

**Viva point:** "The Dockerfile bundles Python, Flask, and the app code into
one image, so the app behaves the same on a laptop, a VM, or an AWS server."

---

## 3. Oracle VirtualBox — VM Testing Environment
Before deploying to the real cloud, test the containerized app inside a
virtual machine to simulate a server environment.

**Steps:**
1. Install Oracle VirtualBox and create a new VM (e.g., Ubuntu Server 22.04,
   2 GB RAM, 20 GB disk).
2. Boot the VM and install Docker inside it:
   ```bash
   sudo apt update
   sudo apt install -y docker.io
   sudo systemctl enable --now docker
   ```
3. Copy the project into the VM (via shared folder, `scp`, or `git clone`).
4. Build and run the container inside the VM exactly as in Step 2.
5. From your host machine's browser, visit the VM's IP address
   (find it with `ip addr` inside the VM) to confirm the app works
   in an isolated, server-like environment.

**Viva point:** "VirtualBox lets us rehearse the deployment on an isolated
virtual server before touching real cloud infrastructure, catching
environment issues early."

---

## 4. AWS Console — Deploying and Managing Cloud Services
Once tested locally and in the VM, deploy to AWS for real cloud hosting.

**Simple path using EC2:**
1. In the AWS Console, launch an **EC2 instance** (Ubuntu, t2.micro is free-tier eligible).
2. Open port 5000 (or 80) in the instance's **Security Group**.
3. SSH into the instance:
   ```bash
   ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>
   ```
4. Install Docker on the instance (same commands as Step 3).
5. Copy the project onto the instance and run:
   ```bash
   docker build -t carpool-app .
   docker run -d -p 80:5000 carpool-app
   ```
6. Visit `http://<EC2_PUBLIC_IP>` — the platform is now live on the cloud.

**Optional / more advanced (mention in viva as "future scope"):**
- Push the Docker image to **Amazon ECR** and run it on **ECS/Fargate** for
  managed container orchestration.
- Use **RDS** instead of SQLite for a production-grade database.
- Use **Elastic Load Balancer** + **Auto Scaling Group** to handle more users.

**Viva point:** "AWS Console is where the containerized app actually gets
hosted and made accessible to real users, and where we'd scale it up if
demand increased."

---

## 5. CloudSim — Simulating Cloud Resources & Performance Analysis
`cloudsim_simulation/simulate_performance.py` models the same core concepts
CloudSim uses (Datacenter → VMs → Cloudlets) to study how the platform
performs under increasing load, **without needing to actually rent that
much cloud capacity**.

```bash
cd cloudsim_simulation
pip install matplotlib
python simulate_performance.py
```

This prints a table of results and saves **`performance_report.png`** — a
graph of:
- **Average response time** as the number of simultaneous ride-match
  requests grows (10 → 5000)
- **Datacenter (VM pool) utilization** at each load level

Use this graph in your report/PPT to discuss how the system scales and
where bottlenecks appear (e.g., utilization hits 100% once requests exceed
what 4 VMs can keep up with, and response time grows accordingly).

**Note:** Real CloudSim is a Java toolkit (used inside Eclipse with the
CloudSim JAR). This script reproduces the same Datacenter/VM/Cloudlet
scheduling logic in Python so it's runnable anywhere for your demo — the
underlying simulation design (round-robin scheduling across VMs, response
time = queueing delay + service time) is the same concept your instructor
expects from a CloudSim-based analysis. If your course requires an actual
`.java` CloudSim project, this script's scheduling logic maps directly
onto CloudSim's `Datacenter`, `Vm`, and `Cloudlet` classes.

**Viva point:** "CloudSim-style simulation lets us predict and analyze
performance and scalability before deploying at full scale, saving cost
and catching bottlenecks early."

---

## One-Line Summary for Viva
"Docker packages the app, VirtualBox tests it in an isolated VM, AWS Console
deploys and hosts it on real cloud infrastructure, and CloudSim-style
simulation analyzes how it performs and scales under load — all supporting
the goal of connecting drivers and riders on similar routes efficiently."
