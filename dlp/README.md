# Automated Data Lake Partitioning and Compaction Pipeline

A working pipeline that solves the classic **data lake "small file problem"**:
every time data is ingested, it tends to land as lots of tiny files; over time
this slows down query engines that have to open every single one. This project:

1. **Ingests** raw data files (`.json` or `.csv`) and automatically **partitions**
   records into a Hive-style `year=YYYY/month=MM/day=DD/` folder layout, based on
   each record's `timestamp` field.
2. **Compacts** — on demand — every partition that has accumulated at least N
   ("threshold") small raw files, merging them into a single larger file per
   partition, and reports exactly how many files/bytes were saved.
3. Optionally **pushes** compacted files to a real **AWS S3** bucket.
4. Ships with a **Docker** setup to containerize the whole thing.
5. Includes a separate **CloudSim** (Java) simulation modeling the same compaction
   jobs scheduled across a simulated multi-VM datacenter.
6. Documents how to run the Dockerized app inside an **Oracle VirtualBox** VM, as
   an on-prem alternative to cloud (AWS) deployment.

## Tech stack
- **Frontend:** plain HTML, CSS, JavaScript
- **Backend:** Node.js + Express
- **Database:** MongoDB (via Mongoose) — stores metadata (file locations, sizes,
  partition keys, pipeline run history), not the actual data records
- **File storage:** local disk under `backend/data-lake/` (raw / compacted / archive)
- **Auth:** JWT, passwords hashed with bcrypt
- **AWS SDK v3** (`@aws-sdk/client-s3`) for the optional S3 push feature
- **CloudSim** (Java) for the separate scheduling simulation

## Project structure
```
dlp/
  backend/
    config/db.js              MongoDB connection
    models/                   User, RawUpload, PartitionFile, PipelineRun
    middleware/auth.js        JWT verification
    services/
      partitionService.js     parses uploads, groups records by date, writes raw partition files
      compactionService.js    merges small raw files per partition into one compacted file
      s3Service.js            optional push of a compacted file to AWS S3
    controllers/, routes/     REST API
    server.js                 app entry point — also serves the frontend
    seedAdmin.js               creates the first operator account
    data-lake/                 GENERATED — raw/compacted/archive files live here (gitignored)
    package.json, .env.example
  frontend/
    index.html                 login
    register.html               operator sign-up
    dashboard.html              upload, partitions, run pipeline, history — all-in-one
    css/style.css, js/api.js
  sample-data/
    batch-1.json ... batch-5.json   ready-made test files (see below)
  cloudsim-simulation/
    PartitionCompactionSimulation.java   Java/CloudSim scheduling simulation
    README.md                              separate setup instructions (Eclipse/IntelliJ)
  Dockerfile, docker-compose.yml, .dockerignore
  README.md   (this file)
```

## Part 1 — Run the web app locally

1. **Install MongoDB** locally, or use a free MongoDB Atlas cluster.
2. Install dependencies:
   ```bash
   cd backend
   npm install
   ```
3. Configure environment variables:
   ```bash
   copy .env.example .env
   ```
   Edit `.env` — set `MONGO_URI` and a strong `JWT_SECRET`. Leave the `AWS_*` fields
   blank unless you're using the S3 feature (see Part 3).
4. Create the first operator account:
   ```bash
   node seedAdmin.js
   ```
   Creates `admin@example.com` / `admin123`.
5. Start the server:
   ```bash
   npm start
   ```
6. Open `http://localhost:5000` and log in.

### Try it out with the sample data
The `sample-data/` folder has 5 files, each with 20 records spread randomly across
3 days — deliberately simulating repeated small ingestion batches landing on the
same dates. Upload all 5 from the **Ingest Data** tab, then go to the **Partitions**
tab: you'll see each date partition has accumulated 5 raw files. Click
**Run Compaction Pipeline** — each partition (now at/above the threshold) gets
merged down to 1 file, and the run's before/after file count and size show the
concrete space/file-count savings.

## Part 2 — Run it with Docker

From the project root (`dlp/`, not `backend/`):
```bash
docker compose up --build
```
This starts two containers: the app (built from `Dockerfile`) and a MongoDB
instance, networked together automatically (`docker-compose.yml` points the app
at `mongodb://mongo:27017/data_lake_pipeline` — no `.env` needed for this path).
Once it's up, go to `http://localhost:5000`.

To create the operator account inside the running container:
```bash
docker exec -it dlp-app node seedAdmin.js
```

## Part 3 — Optional: push compacted files to AWS S3

1. **AWS Console steps:**
   - Log into the AWS Console → S3 → **Create bucket** (any unique name, e.g. `your-name-data-lake`)
   - Go to IAM → **Users** → create a user with **Programmatic access** and an
     `AmazonS3FullAccess` policy (or a scoped-down custom policy for just this bucket)
   - Note the **Access Key ID** and **Secret Access Key** it gives you
2. Add these to `backend/.env`:
   ```
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   AWS_REGION=ap-south-1
   AWS_S3_BUCKET=your-bucket-name
   ```
3. Restart the server. Open any **compacted** file in the Partitions tab — a
   **"Push to S3"** button now appears. Click it, then check your S3 bucket in
   the AWS Console — you'll see the file land under `data-lake/year=.../month=.../day=.../`.

## Part 4 — Run inside an Oracle VirtualBox VM (on-prem comparison)

This demonstrates deploying the same Dockerized app on your own virtual "on-prem"
machine, as a contrast to the AWS cloud storage path above:

1. Download & install **Oracle VirtualBox** and an **Ubuntu Server** ISO.
2. Create a new VM (2+ GB RAM, 20+ GB disk), attach the Ubuntu ISO, and install
   the OS following the installer prompts.
3. Inside the VM, install Docker:
   ```bash
   sudo apt update
   sudo apt install -y docker.io docker-compose
   sudo systemctl enable --now docker
   ```
4. Transfer this project into the VM (e.g. `git clone` your repo, or use
   VirtualBox's shared folders feature) and run:
   ```bash
   cd dlp
   sudo docker compose up --build
   ```
5. In VirtualBox's network settings for the VM, set up **Port Forwarding**
   (Host port 5000 → Guest port 5000) so you can reach `http://localhost:5000`
   from your host machine's browser, exactly like running it natively.

This is a good talking point for your report: the same containerized app running
identically on a local VM (simulating on-prem infrastructure) versus a cloud VM/managed
service — a common comparison in cloud computing coursework.

## Part 5 — CloudSim simulation

See `cloudsim-simulation/README.md` — this is a separate Java program (CloudSim
requires Java/Eclipse or IntelliJ, not Node.js) that simulates the compaction jobs
being scheduled across a 3-VM datacenter, producing per-job execution timing you
can include in your report alongside the real pipeline's actual before/after metrics.

## API summary

| Method | Route | Purpose |
|---|---|---|
| POST | /api/auth/register | Create an operator account |
| POST | /api/auth/login | Log in |
| GET | /api/auth/me | Current user |
| POST | /api/uploads | Upload + auto-partition a raw file |
| GET | /api/uploads | Upload history |
| GET | /api/partitions | Partition overview (raw/compacted counts & sizes) |
| GET | /api/partitions/:key/files | Files within one partition |
| POST | /api/pipeline/run | Trigger a compaction pass |
| GET | /api/pipeline/runs | Pipeline run history |
| GET | /api/s3/status | Whether AWS S3 push is configured |
| POST | /api/s3/upload/:fileId | Push one compacted file to S3 |

## Possible extensions for your report
- Scheduled/automatic compaction (cron-style) instead of a manual button
- Partition pruning demo — show a query engine skipping irrelevant partitions
- Compression (gzip) on compacted files, to show a second layer of size savings
- Real distributed execution (e.g. Bull/Redis job queue across multiple worker processes)
  as a bridge between the single-process Node pipeline and the CloudSim multi-VM model
