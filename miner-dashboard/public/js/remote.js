/**
 * Remote Access Landing Page JavaScript
 */

// Installation instructions data
const installationInstructions = {
    usb: {
        title: 'USB Bootable Image Installation',
        content: `
            <h3>Step 1: Build the ISO Image</h3>
            <p>Build the Quai GPU Miner ISO image from source:</p>
            <code>cd os-build<br>sudo ./scripts/build-iso.sh</code>
            <p class="info-note">The ISO will be created in <code>output/quai-gpu-miner.iso</code></p>
            
            <p><strong>Or download from GitHub releases (when available):</strong></p>
            <code>wget https://github.com/thecrackofdan/Quai-GPU-Miner/releases/latest/download/quai-gpu-miner.iso</code>
            
            <h3>Step 2: Verify the Download</h3>
            <p>Verify the SHA256 checksum:</p>
            <code>sha256sum quai-gpu-miner.iso</code>
            <p>Compare with the checksum provided on the releases page.</p>
            
            <h3>Step 3: Flash to USB Drive</h3>
            <p><strong>Linux/Mac:</strong></p>
            <code>sudo dd if=quai-gpu-miner.iso of=/dev/sdX bs=4M status=progress</code>
            <p class="warning">⚠️ Replace /dev/sdX with your USB device (use lsblk to find it)</p>
            
            <p><strong>Linux:</strong></p>
            <p>Use <code>dd</code> command or <a href="https://www.balena.io/etcher" target="_blank">Balena Etcher</a> to flash the ISO to your USB drive.</p>
            
            <h3>Step 4: Boot from USB</h3>
            <ol>
                <li>Insert the USB drive into your mining rig</li>
                <li>Boot the system and enter BIOS/UEFI settings (usually F2, F12, or Del)</li>
                <li>Set USB as the first boot device</li>
                <li>Save and exit</li>
                <li>The system will boot into Quai GPU Miner</li>
            </ol>
            
            <h3>Step 4: First Boot Setup</h3>
            <p>The OS will automatically:</p>
            <ul>
                <li>Detect your hardware</li>
                <li>Install GPU drivers</li>
                <li>Configure optimal settings</li>
                <li>Start the dashboard</li>
            </ul>
            <p>Access the dashboard at: <code>http://RIG-IP:3000</code></p>
            
            <h3>Step 5: Configure Mining</h3>
            <ol>
                <li>Open the dashboard in your browser</li>
                <li>Enter your Quai node RPC URL</li>
                <li>Enter your wallet address</li>
                <li>Click "Start Mining"</li>
            </ol>
        `
    },
    installer: {
        title: 'Automated Installer Installation',
        content: `
            <h3>Prerequisites</h3>
            <ul>
                <li>Ubuntu 20.04+ or Debian 11+</li>
                <li>Root or sudo access</li>
                <li>Internet connection</li>
                <li>AMD or NVIDIA GPU</li>
            </ul>
            
            <h3>Step 1: Get the Installer</h3>
            <p><strong>From GitHub:</strong></p>
            <code>git clone https://github.com/thecrackofdan/Quai-GPU-Miner.git<br>cd Quai-GPU-Miner/miner-dashboard</code>
            
            <p><strong>Or download directly:</strong></p>
            <code>wget https://raw.githubusercontent.com/thecrackofdan/Quai-GPU-Miner/main/miner-dashboard/install-production.sh</code>
            
            <h3>Step 2: Make Executable</h3>
            <code>chmod +x auto-install.sh</code>
            
            <h3>Step 3: Run the Installer</h3>
            <code>sudo ./auto-install.sh</code>
            
            <p>The installer will:</p>
            <ul>
                <li>Detect your GPU hardware</li>
                <li>Install appropriate drivers (NVIDIA or AMD)</li>
                <li>Install Quai GPU Miner</li>
                <li>Configure optimal settings</li>
                <li>Set up systemd services</li>
                <li>Start mining automatically</li>
            </ul>
            
            <h3>Step 4: Access Dashboard</h3>
            <p>After installation, access the dashboard at:</p>
            <code>http://localhost:3000</code>
            <p>Or from another device on your network:</p>
            <code>http://YOUR-SERVER-IP:3000</code>
            
            <h3>Step 5: Configure</h3>
            <p>Use the dashboard to:</p>
            <ul>
                <li>Configure your Quai node RPC URL</li>
                <li>Set your wallet address</li>
                <li>Adjust GPU settings</li>
                <li>Enable merged mining</li>
            </ul>
            
            <h3>Manual Configuration (Optional)</h3>
            <p>Edit the configuration file:</p>
            <code>sudo nano /etc/quaiminer/config.json</code>
            
            <h3>Service Management</h3>
            <p>Control the miner service:</p>
            <code>sudo systemctl start quaiminer-miner</code>
            <code>sudo systemctl stop quaiminer-miner</code>
            <code>sudo systemctl status quaiminer-miner</code>
            <code>sudo journalctl -u quaiminer-miner -f</code>
        `
    }
};

// Show download instructions
function showDownloadInstructions(type) {
    const modal = document.getElementById('instructionsModal');
    const title = document.getElementById('instructionsTitle');
    const content = document.getElementById('instructionsContent');
    
    if (modal && title && content && installationInstructions[type]) {
        title.textContent = installationInstructions[type].title;
        content.innerHTML = installationInstructions[type].content;
        modal.style.display = 'block';
    }
}

// Connect to rig
document.addEventListener('DOMContentLoaded', () => {
    const connectBtn = document.getElementById('connectBtn');
    const connectRigBtn = document.getElementById('connectRigBtn');
    const connectionModal = document.getElementById('connectionModal');
    
    if (connectBtn) {
        connectBtn.addEventListener('click', () => {
            if (connectionModal) {
                connectionModal.style.display = 'block';
            }
        });
    }
    
    if (connectRigBtn) {
        connectRigBtn.addEventListener('click', () => {
            const urlInput = document.getElementById('rigUrlInput');
            const nameInput = document.getElementById('rigNameInput');
            
            if (urlInput && urlInput.value.trim()) {
                const url = urlInput.value.trim();
                const name = nameInput ? nameInput.value.trim() : 'Mining Rig';
                
                // Save to localStorage
                localStorage.setItem('remoteRigUrl', url);
                localStorage.setItem('remoteRigName', name);
                
                // Redirect to dashboard with rig URL
                window.location.href = `/index.html?rig=${encodeURIComponent(url)}`;
            } else {
                alert('Please enter a valid rig URL');
            }
        });
    }
    
    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    // Load saved rig URL
    const savedUrl = localStorage.getItem('remoteRigUrl');
    if (savedUrl && document.getElementById('rigUrlInput')) {
        document.getElementById('rigUrlInput').value = savedUrl;
    }
});

