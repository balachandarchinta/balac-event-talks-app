from flask import Flask, jsonify, request, render_template
import feedparser
from bs4 import BeautifulSoup
import re
import time
import requests

app = Flask(__name__)

# Cache configuration
CACHE_EXPIRY_SECONDS = 600  # 10 minutes
feed_cache = {
    "data": None,
    "last_updated": 0
}

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def clean_html_content(html):
    """
    Cleans up raw feed HTML to make it look premium.
    For example, makes code tags, lists, and links styled beautifully.
    """
    if not html:
        return ""
    
    # We can do some minor transformations if needed,
    # but the frontend CSS will handle styling of p, code, a, ul, li tags.
    # We just make sure there are no dangerous scripts or tags.
    soup = BeautifulSoup(html, "html.parser")
    
    # Ensure links open in a new tab
    for link in soup.find_all("a"):
        link["target"] = "_blank"
        link["rel"] = "noopener noreferrer"
        
    return str(soup)

def parse_release_notes():
    """
    Fetches the RSS XML feed and parses it into individual updates.
    Splits items by H3 headings.
    """
    try:
        # Use requests to fetch with a timeout, then pass to feedparser
        response = requests.get(FEED_URL, timeout=10)
        response.raise_for_status()
        feed_data = feedparser.parse(response.content)
    except Exception as e:
        print(f"Error fetching feed: {e}")
        # If network fails, return None to indicate error
        return None

    all_updates = []
    
    for entry in feed_data.entries:
        date_str = entry.get("title", "Unknown Date")
        updated_at = entry.get("updated", "")
        # The primary link for the entry
        base_link = entry.get("link", "https://cloud.google.com/bigquery/docs/release-notes")
        
        summary_html = entry.get("summary", "")
        if not summary_html:
            content_list = entry.get("content", [])
            if content_list:
                summary_html = content_list[0].value
                
        if not summary_html:
            continue
            
        soup = BeautifulSoup(summary_html, "html.parser")
        headers = soup.find_all("h3")
        
        if not headers:
            # If no h3 header is found, treat the entry as a single "General" update
            text_desc = soup.get_text(separator=" ").strip()
            text_desc = re.sub(r'\s+', ' ', text_desc)
            cleaned_html = clean_html_content(summary_html)
            
            # Extract unique ID for deep linking
            anchor = date_str.replace(" ", "_").replace(",", "")
            item_link = f"{base_link.split('#')[0]}#{anchor}"
            
            # Generate a stable ID
            unique_id = f"update-{date_str.replace(' ', '-').replace(',', '')}-general"
            
            all_updates.append({
                "id": unique_id,
                "date": date_str,
                "updated_at": updated_at,
                "link": item_link,
                "type": "General",
                "html_content": cleaned_html,
                "text_content": text_desc
            })
            continue
            
        for i, header in enumerate(headers):
            update_type = header.get_text().strip()
            
            # Find sibling elements until the next H3 header
            sibling_html = []
            sibling_text = []
            sibling = header.next_sibling
            while sibling and sibling.name != "h3":
                if sibling.name:
                    sibling_html.append(str(sibling))
                    sibling_text.append(sibling.get_text(separator=" ").strip())
                elif isinstance(sibling, str) and sibling.strip():
                    sibling_html.append(sibling)
                    sibling_text.append(sibling.strip())
                sibling = sibling.next_sibling
                
            html_desc = "".join(sibling_html).strip()
            text_desc = " ".join(sibling_text).strip()
            text_desc = re.sub(r'\s+', ' ', text_desc)
            
            cleaned_html = clean_html_content(html_desc)
            
            # Generate a specific deep link hash based on date and type/index
            anchor = f"{date_str.replace(' ', '_').replace(',', '')}"
            item_link = f"{base_link.split('#')[0]}#{anchor}"
            
            unique_id = f"update-{date_str.replace(' ', '-').replace(',', '')}-{update_type.lower()}-{i}"
            
            all_updates.append({
                "id": unique_id,
                "date": date_str,
                "updated_at": updated_at,
                "link": item_link,
                "type": update_type,
                "html_content": cleaned_html,
                "text_content": text_desc
            })
            
    return all_updates

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/releases")
def get_releases():
    force_refresh = request.args.get("refresh", "false").lower() == "true"
    current_time = time.time()
    
    # Serve from cache if available and not expired/forced refresh
    if not force_refresh and feed_cache["data"] is not None and (current_time - feed_cache["last_updated"] < CACHE_EXPIRY_SECONDS):
        return jsonify({
            "status": "success",
            "source": "cache",
            "last_updated": feed_cache["last_updated"],
            "updates": feed_cache["data"]
        })
        
    # Fetch and parse
    updates = parse_release_notes()
    
    if updates is None:
        # If fetching fails but we have cached data, return cached data with warning
        if feed_cache["data"] is not None:
            return jsonify({
                "status": "warning",
                "message": "Failed to fetch new data. Serving cached data.",
                "source": "cache_fallback",
                "last_updated": feed_cache["last_updated"],
                "updates": feed_cache["data"]
            })
        else:
            return jsonify({
                "status": "error",
                "message": "Failed to fetch release notes and no cache is available."
            }), 500
            
    # Update cache
    feed_cache["data"] = updates
    feed_cache["last_updated"] = current_time
    
    return jsonify({
        "status": "success",
        "source": "live",
        "last_updated": current_time,
        "updates": updates
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)
