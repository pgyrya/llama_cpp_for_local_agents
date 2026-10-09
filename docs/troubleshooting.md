# Troubleshooting Guide

## Server Won't Start

### 1. Check NVIDIA Container Toolkit
```bash
nvidia-smi
```
If this fails, install the NVIDIA Container Toolkit:
```bash
# Ubuntu/Debian
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

### 2. Check Docker Logs
```bash
docker logs local-llm -f
```

### 3. Verify Model File Exists
```bash
ls -la models/*.gguf
```

### 4. Check Port Conflicts
```bash
# Check if port 41980 is already in use
lsof -i :41980

# Check if container is already running
docker ps | grep local-llm
```

## MCP Server Not Connecting

### 1. Check MCP Server is Running
```bash
curl http://localhost:3001/
```

### 2. Verify mcp-config.json Paths
Ensure all paths in `.config/mcp-config.json` are correct and accessible from within Docker.

### 3. Check Docker Volume Mounts
```bash
# Inspect container volume mounts
docker inspect local-llm | grep -A 20 Mounts
```

### 4. Restart MCP Servers
```bash
# doc-editor
cd mcp-services/doc-editor
npm run build
# Restart the server process
```

## GPU Out of Memory

### 1. Use a Smaller Model
Switch to Qwen3.5-4B or Qwen3.8-9B in `docker-compose.yml`.

### 2. Reduce Context Window
Lower the `-c` flag value (e.g., from 69632 to 32768).

### 3. Use Higher Quantization
Note: Higher quantization = larger file. For OOM errors, use **lower** quantization (Q4 → Q3).

### 4. Check GPU Memory Usage
```bash
nvidia-smi
```

## Docker Compose Issues

### Build Fails
```bash
# Clean and rebuild
docker-compose down
docker system prune -f
docker-compose up --build -d
```

### Permission Denied on Volume Mounts
```bash
# Ensure files are readable
chmod 644 .config/*.json
chmod 644 mcp-services/doc-editor/src/stdio-bridge.py
```

## Model Loading Issues

### GGUF File Corrupted
```bash
# Verify file integrity
sha256sum models/*.gguf
# Compare with expected checksums
```

### Multimodal Projector Mismatch
Ensure the `mmproj` file matches the base model. Check [Models Documentation](models/README.md) for compatibility.
