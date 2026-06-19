# BigQuery Release Notes Tracker

An interactive dashboard that fetches, parses, categorizes, and tracks real-time Google Cloud BigQuery release notes. It splits daily release logs into granular, searchable items and provides built-in sharing features for Twitter/X.

## 🚀 Features

- **Granular Updates**: Splits bulk daily release logs (grouped as single feed entries in the official feed) into individual update cards based on heading topics (`<h3>`).
- **Semantic Filtering**: Updates are automatically categorized into *Feature*, *Announcement*, *Changed*, *Deprecated*, *Issue*, and *Fixed*.
- **In-Memory Caching**: Implements a 10-minute server-side cache to improve performance and avoid hitting Google Cloud feed endpoints excessively, with a fallback mechanism if the feed goes offline.
- **Client-Side Search & Filter**: Real-time searching and filtering by category pills, with date-based sorting (Latest First / Oldest First).
- **Interactive Twitter / X Sharing**: Built-in tweet composer that automatically formats and trims updates to fit the 280-character limit, complete with direct deep links and hashtags.
- **Modern UI/UX**: Designed with smooth CSS animations, stats overview panels, loading skeletons, custom scrollbars, and toast notifications.

---

## 🛠️ Tech Stack

- **Backend**: Python 3, Flask, `feedparser` (RSS/Atom parsing), `BeautifulSoup` (HTML sanitization and extraction), `requests`.
- **Frontend**: Vanilla HTML5, Vanilla CSS3 (custom CSS variables & gradients), Vanilla JS (ES6+ state-driven UI), Lucide Icons, Google Fonts (Inter).

---

## 💻 Local Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/balachandarchinta/balac-event-talks-app.git
   cd balac-event-talks-app
   ```

2. **Set up a Virtual Environment**:
   ```bash
   python -m venv .venv
   # On Windows:
   .venv\Scripts\activate
   # On macOS/Linux:
   source .venv/bin/activate
   ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the Application**:
   ```bash
   python app.py
   ```
   The application will start locally at `http://127.0.0.1:5000/`.

---

## 📂 Project Structure

```text
├── static/
│   ├── css/
│   │   └── styles.css      # Custom stylesheet with variables and styling
│   └── js/
│       └── app.js          # Main client-side logic and state management
├── templates/
│   └── index.html          # Main HTML5 entry page
├── app.py                  # Flask server logic, XML parser, and API router
├── requirements.txt        # Python package dependencies
├── .gitignore              # Files ignored by git version control
└── README.md               # Project documentation
```

---

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request if you want to suggest improvements or add features.
