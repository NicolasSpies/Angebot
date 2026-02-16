## Local Development

This project includes custom launcher scripts for macOS to make local development easier.

### Quick Start
1.  **Launch**: Double-click `Launch Angebot Workspace.command`. 
    - This will start the backend (port 3001) and frontend (port 5173).
    - It opens two Terminal tabs and automatically launches your browser and database viewer.
    - If `node_modules` is missing, it will run `npm install` automatically.

2.  **Stop**: Double-click `Stop Angebot Workspace.command`.
    - This cleanly shuts down both servers and frees up the ports.

### Configuration
- **Frontend Port**: 5173
- **Backend Port**: 3001
- **Database**: `database.sqlite` (SQLite)

### Troubleshooting
- **Port Conflict**: If the launcher says a port is in use, it will attempt to kill the stale process for you.
- **Dependencies**: Ensure you have Node.js installed. If `npm install` fails, try running it manually in the terminal.
