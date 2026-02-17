import sqlite3
import json
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

conn = sqlite3.connect('/home/jdc/Desktop/battleground/fliptop.db')
emcees_conn = conn
video_conn = sqlite3.connect('/home/jdc/Desktop/battleground/youtube_videos.db')
BASE_DIR = '/home/jdc/Desktop/battleground/fliptop-platform'

class APIHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        if path.startswith('/api/'):
            self.handle_api(path, query)
        else:
            if path == '/':
                path = '/index.html'
            file_path = BASE_DIR + path
            if os.path.isfile(file_path):
                self.send_response(200)
                if path.endswith('.html'):
                    self.send_header('Content-Type', 'text/html')
                elif path.endswith('.css'):
                    self.send_header('Content-Type', 'text/css')
                elif path.endswith('.js'):
                    self.send_header('Content-Type', 'application/javascript')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                with open(file_path, 'rb') as f:
                    self.wfile.write(f.read())
            else:
                self.send_error(404)

    def handle_api(self, path, query):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

        try:
            if path == '/api/emcees':
                limit = int(query.get('limit', [100])[0])
                search = query.get('search', [''])[0]
                division = query.get('division', [''])[0]

                sql = 'SELECT id, name, profile_picture, title, hometown, reppin, division, year_joined, accomplishments FROM emcees WHERE 1=1'
                params = []
                if search:
                    sql += ' AND name LIKE ?'
                    params.append(f'%{search}%')
                if division:
                    sql += ' AND division = ?'
                    params.append(division)
                sql += ' ORDER BY name ASC LIMIT ?'
                params.append(limit)

                cursor = emcees_conn.cursor()
                cursor.execute(sql, params)
                rows = cursor.fetchall()
                emcees = [{'id': r[0], 'name': r[1], 'profile_picture': r[2], 'title': r[3], 'hometown': r[4], 'reppin': r[5], 'division': r[6], 'year_joined': r[7], 'accomplishments': r[8]} for r in rows]
                self.wfile.write(json.dumps({'emcees': emcees, 'total': len(emcees)}).encode())

            elif path.startswith('/api/emcees/'):
                emcee_id = path.split('/')[-1]
                cursor = emcees_conn.cursor()
                cursor.execute('SELECT * FROM emcees WHERE id = ?', (emcee_id,))
                row = cursor.fetchone()
                if row:
                    emcee = {'id': row[0], 'name': row[1], 'profile_picture': row[3], 'title': row[4], 'hometown': row[5], 'reppin': row[6], 'division': row[7], 'year_joined': row[8], 'accomplishments': row[9], 'description': row[10], 'facebook': row[14], 'twitter': row[15], 'instagram': row[16], 'youtube': row[17], 'latest_battles': json.loads(row[18]) if row[18] else []}
                    self.wfile.write(json.dumps(emcee).encode())
                else:
                    self.wfile.write(json.dumps({'error': 'Not found'}).encode())

            elif path == '/api/videos':
                limit = int(query.get('limit', [50])[0])
                sort = query.get('sort', ['views'])[0]
                cursor = video_conn.cursor()
                cursor.execute(f'SELECT id, videoId, title, publishedAt, thumbnail, views, likes, comments, url FROM videos ORDER BY {sort} DESC LIMIT ?', (limit,))
                rows = cursor.fetchall()
                videos = [{'id': r[0], 'videoId': r[1], 'title': r[2], 'publishedAt': r[3], 'thumbnail': r[4], 'views': r[5], 'likes': r[6], 'comments': r[7], 'url': r[8]} for r in rows]
                self.wfile.write(json.dumps({'videos': videos}).encode())

            elif path == '/api/stats':
                emcee_cursor = emcees_conn.cursor()
                video_cursor = video_conn.cursor()
                emcee_count = emcee_cursor.execute('SELECT COUNT(*) FROM emcees').fetchone()[0]
                video_count = video_cursor.execute('SELECT COUNT(*) FROM videos').fetchone()[0]
                total_views = video_cursor.execute('SELECT SUM(views) FROM videos').fetchone()[0] or 0
                self.wfile.write(json.dumps({'total_emcees': emcee_count, 'total_videos': video_count, 'total_views': total_views}).encode())

            elif path == '/api/stats/by-year':
                year = query.get('year', [None])[0]
                limit = int(query.get('limit', [20])[0])
                cursor = video_conn.cursor()
                if year:
                    cursor.execute('SELECT id, videoId, title, publishedAt, thumbnail, views, likes, comments, url, substr(publishedAt,1,4) FROM videos WHERE substr(publishedAt,1,4)=? ORDER BY views DESC LIMIT ?', (year, limit))
                else:
                    cursor.execute('SELECT id, videoId, title, publishedAt, thumbnail, views, likes, comments, url, substr(publishedAt,1,4) FROM videos ORDER BY views DESC LIMIT ?', (limit,))
                rows = cursor.fetchall()
                videos = [{'id': r[0], 'videoId': r[1], 'title': r[2], 'publishedAt': r[3], 'thumbnail': r[4], 'views': r[5], 'likes': r[6], 'comments': r[7], 'url': r[8], 'year': r[9]} for r in rows]
                cursor.execute('SELECT DISTINCT substr(publishedAt,1,4) FROM videos ORDER BY substr(publishedAt,1,4) DESC')
                years = [r[0] for r in cursor.fetchall()]
                self.wfile.write(json.dumps({'videos': videos, 'years': years}).encode())

            elif path == '/api/stats/by-division':
                division = query.get('division', [None])[0]
                year = query.get('year', [None])[0]
                limit = int(query.get('limit', [20])[0])
                cursor = video_conn.cursor()
                emcee_cursor = emcees_conn.cursor()

                # Get list of divisions
                emcee_cursor.execute('SELECT DISTINCT division FROM emcees WHERE division IS NOT NULL AND division != "" ORDER BY division')
                divisions = [r[0] for r in emcee_cursor.fetchall()]

                if division:
                    # Get emcees in this division
                    emcee_cursor.execute('SELECT name FROM emcees WHERE division = ?', (division,))
                    emcees_in_div = [r[0] for r in emcee_cursor.fetchall()]

                    # Get videos featuring these emcees
                    videos = []
                    for emcee in emcees_in_div:
                        if year:
                            cursor.execute("SELECT id, videoId, title, publishedAt, thumbnail, views, likes, comments, url FROM videos WHERE (title LIKE ? OR title LIKE ?) AND substr(publishedAt,1,4)=? ORDER BY views DESC LIMIT 10", (f'%{emcee}% vs %', f'%vs {emcee}%', year))
                        else:
                            cursor.execute("SELECT id, videoId, title, publishedAt, thumbnail, views, likes, comments, url FROM videos WHERE title LIKE ? OR title LIKE ? ORDER BY views DESC LIMIT 10", (f'%{emcee}% vs %', f'%vs {emcee}%'))
                        for row in cursor.fetchall():
                            videos.append({'id': row[0], 'videoId': row[1], 'title': row[2], 'publishedAt': row[3], 'thumbnail': row[4], 'views': row[5], 'likes': row[6], 'comments': row[7], 'url': row[8]})

                    videos.sort(key=lambda x: x['views'], reverse=True)
                    videos = videos[:limit]
                else:
                    if year:
                        cursor.execute('SELECT id, videoId, title, publishedAt, thumbnail, views, likes, comments, url FROM videos WHERE substr(publishedAt,1,4)=? ORDER BY views DESC LIMIT ?', (year, limit))
                    else:
                        cursor.execute('SELECT id, videoId, title, publishedAt, thumbnail, views, likes, comments, url FROM videos ORDER BY views DESC LIMIT ?', (limit,))
                    rows = cursor.fetchall()
                    videos = [{'id': r[0], 'videoId': r[1], 'title': r[2], 'publishedAt': r[3], 'thumbnail': r[4], 'views': r[5], 'likes': r[6], 'comments': r[7], 'url': r[8]} for r in rows]

                self.wfile.write(json.dumps({'videos': videos, 'divisions': divisions}).encode())

            elif path == '/api/stats/by-emcee':
                emcee_name = query.get('emcee', [None])[0]
                year = query.get('year', [None])[0]
                limit = int(query.get('limit', [20])[0])
                cursor = video_conn.cursor()
                emcee_cursor = emcees_conn.cursor()
                emcee_cursor.execute('SELECT name FROM emcees ORDER BY name')
                emcees = [r[0] for r in emcee_cursor.fetchall()]

                if emcee_name:
                    if year:
                        cursor.execute("SELECT id, videoId, title, publishedAt, thumbnail, views, likes, comments, url FROM videos WHERE (title LIKE ? OR title LIKE ?) AND substr(publishedAt,1,4)=? ORDER BY views DESC LIMIT ?", (f'%{emcee_name}% vs %', f'%vs {emcee_name}%', year, limit))
                    else:
                        cursor.execute("SELECT id, videoId, title, publishedAt, thumbnail, views, likes, comments, url FROM videos WHERE title LIKE ? OR title LIKE ? ORDER BY views DESC LIMIT ?", (f'%{emcee_name}% vs %', f'%vs {emcee_name}%', limit))
                    rows = cursor.fetchall()
                    videos = [{'id': r[0], 'videoId': r[1], 'title': r[2], 'publishedAt': r[3], 'thumbnail': r[4], 'views': r[5], 'likes': r[6], 'comments': r[7], 'url': r[8]} for r in rows]
                    self.wfile.write(json.dumps({'videos': videos, 'emcee': emcee_name}).encode())
                else:
                    emcee_views = []
                    for emcee in emcees:
                        if year:
                            cursor.execute("SELECT SUM(views) FROM videos WHERE (title LIKE ? OR title LIKE ?) AND substr(publishedAt,1,4)=?", (f'%{emcee}% vs %', f'%vs {emcee}%', year))
                        else:
                            cursor.execute("SELECT SUM(views) FROM videos WHERE title LIKE ? OR title LIKE ?", (f'%{emcee}% vs %', f'%vs {emcee}%'))
                        total = cursor.fetchone()[0] or 0
                        if total > 0:
                            emcee_views.append({'name': emcee, 'total_views': total})
                    emcee_views.sort(key=lambda x: x['total_views'], reverse=True)
                    self.wfile.write(json.dumps({'emcees': emcee_views[:limit]}).encode())

            elif path == '/api/divisions':
                cursor = emcees_conn.cursor()
                cursor.execute('SELECT DISTINCT division FROM emcees WHERE division IS NOT NULL AND division != "" ORDER BY division')
                divisions = [r[0] for r in cursor.fetchall()]
                self.wfile.write(json.dumps({'divisions': divisions}).encode())

            else:
                self.wfile.write(json.dumps({'error': 'Not found'}).encode())
        except Exception as e:
            self.wfile.write(json.dumps({'error': str(e)}).encode())

if __name__ == '__main__':
    server = HTTPServer(('localhost', 8000), APIHandler)
    print('FlipTop Platform: http://localhost:8000')
    server.serve_forever()
