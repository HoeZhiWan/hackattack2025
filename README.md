# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Installing Suricata on Windows

1. **Download the Suricata Windows Installer**
    - Go to the official Suricata downloads page:
    https://suricata.io/download/
    - Under Windows, download the latest .msi installer (e.g., Suricata-7.x.x-1-64bit.msi).
2. **Run the Installer**
    - Double-click the downloaded .msi file.
    - Follow the installation prompts.
    - By default, Suricata will be installed to C:\Program Files\Suricata.
3. **Add Suricata to Your PATH**
    - Open the Start Menu, search for Environment Variables, and open Edit the system environment variables.
    - Click Environment Variables.
    - Under System variables, find and select Path, then click Edit.
    - Click New and add:
        C:\Program Files\Suricata
    - Click OK to save.
4. **Download the Emerging Threats Open Rules ZIP File**
    - Go to the [Emerging Threats Open Ruleset](https://rules.emergingthreats.net/open/suricata/) page.
    - Download the latest rules ZIP for your Suricata version, for example:  
      [https://rules.emergingthreats.net/open/suricata-7.0/emerging.rules.zip](https://rules.emergingthreats.net/open/suricata-7.0/emerging.rules.zip)
    - Right-click the downloaded `emerging.rules.zip` file and select "Extract All..."
    - Extract the contents to a folder (e.g., your Downloads folder).
    - Open the extracted folder. You will see many `.rules` files.
    - Copy all `.rules` files to your Suricata rules directory:  
      `C:\Program Files\Suricata\rules`
5. **Download and Install Npcap**
    - Go to the official Npcap website:  
      [https://nmap.org/npcap/](https://nmap.org/npcap/)
    - Click the **Download** link to get the latest Npcap installer (e.g., `npcap-<version>.exe`).
    - Run the installer and follow the prompts.
    - During installation, make sure that "Install Npcap in WinPcap API-compatible Mode" is checked.
    - Click **Install** and wait for the process to complete.
    - After installation, Npcap will be ready for Suricata to use for live network capture.
    - Ensure that the wpcap.lib and Packet.lib files exist in the `C:\Program Files\Npcap\Lib` directory.
    - if wpcap.lib and Packet.lib does not exists, install Npcap SDK 1.15 (zip) from the offical Npcap website.
    - Extract the contents into a folder, then copy all of the contents to the npcap directory `C:\Program Files\Npcap\Lib`.