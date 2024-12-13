# Colorado Remediation Projects Map

An interactive visualization of remediation projects in Colorado, displaying site locations, status, and detailed information.

## Features

- Interactive map showing all remediation project locations
- Color-coded markers indicating project status (active/closed)
- Detailed information panel for each site
- Responsive design for desktop and mobile viewing

## Setup

1. Clone the repository:
```bash
git clone https://github.com/YOUR-USERNAME/remediation-map.git
cd remediation-map
```

2. Open `index.html` in a web browser to view the map locally

3. To deploy, push to GitHub Pages or embed in WordPress using the Custom HTML block

## Data Structure

The visualization expects JSON data in the following format:
```json
{
    "Site Name": "Example Site",
    "ProjectStatus": "Active",
    "Operator": "Example Operator",
    "Municipality": "WELD CO",
    "Date Opened": "01/01/2023",
    "Date Closed": "12/31/2023",
    "Lattitude": "40.8395119999999",
    "Longitude": "-104.232877999999"
}
```

## Technologies Used

- Leaflet.js for mapping
- HTML/CSS/JavaScript
- GitHub Pages for hosting

## License

MIT License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a pull request