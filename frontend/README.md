# Frontend - Run Locally

Steps to run the frontend static site locally:

1. Open a terminal in this folder (`frontend`).
2. Install dependencies:

```
npm install
```

3. Start the server:

```
npm start
```


4. Open the site in your browser, for example:

```
http://localhost:3000/index.html
http://localhost:3000/login.html
```

Notes:
- The server serves the files in this directory.
- If port 3000 is already in use, the server will automatically try the next free port (3001, 3002, ...). Check the terminal output to see the actual port in use.
- To specify a port manually, set the `PORT` environment variable before starting. Example:

```
# macOS / Linux
PORT=4000 npm start

# Windows PowerShell
$env:PORT=4000; npm start
```

If you still see "Cannot GET /login.html", ensure the file `login.html` exists in this folder and use the exact URL above.
