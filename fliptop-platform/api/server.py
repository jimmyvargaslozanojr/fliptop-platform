import sqlite3
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import html

conn = sqlite3.connect('/home/jdc/Desktop/battleground/fliptop.db')
emcees_conn = conn

video_conn = sqlite3.connect('/home/jdc/Desktop/battleground/youtube_videos.db')

class APIHandler(BaseHTTPRequestHandler):
    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        # Get all emcees
        if path == '/api/emcees':
            limit = int(query.get('limit', [100])[0])
            offset = int(query.get('offset', [0])[0])
            search = query.get('search', [''])[0]
            division = query.get('division', [''])[0]

            sql = "SELECT id, name, profile_picture, title, hometown, reppin, division, year_joined, accomplishments FROM emcees WHERE 1=1"
            params = []

            if search:
                sql += " AND name LIKE ?"
                params.append(f'%{search}%')
            if division:
                sql += " AND division = ?"
                params.append(division)

            sql += " ORDER BY name ASC LIMIT ? OFFSET ?"
            params.extend([limit, offset])

            cursor = emcees_conn.cursor()
            cursor.execute(sql, params)
            rows = cursor.fetchall()

            emcees = []
            for row in rows:
                emcees.append({
                    'id': row[0],
                    'name': row[1],
                    'profile_picture': row[2],
                    'title': row[3],
                    'hometown': row[4],
                    'reppin': row[5],
                    'division': row[6],
                    'year_joined': row[7],
                    'accomplishments': row[8]
                })

            # Get total count
            count_sql = "SELECT COUNT(*) FROM emcees WHERE 1=1"
            count_params = []
            if search:
                count_sql += " AND name LIKE ?"
                count_params.append(f'%{search}%')
            if division:
                count_sql += " AND division = ?"
                count_params.append(division)
            cursor.execute(count_sql, count_params)
            total = cursor.fetchone()[0]

            self.send_json({'emcees': emcees, 'total': total})

        # Get single emcee
        elif path.startswith('/api/emcees/'):
            emcee_id = path.split('/')[-1]
            cursor = emcees_conn.cursor()
            cursor.execute("SELECT * FROM emcees WHERE id = ?", (emcee_id,))
            row = cursor.fetchall()

            if not row:
                self.send_json({'error': 'Emcee not found'}, 404)
                return

            row = row[0]
            emcee = {
                'id': row[0],
                'name': row[1],
                'url': row[2],
                'profile_picture': row[3],
                'title': row[4],
                'hometown': row[5],
                'reppin': row[6],
                'division': row[7],
                'year_joined': row[8],
                'accomplishments': row[9],
                'description': row[10],
                'facebook': row[14],
                'twitter': row[15],
                'instagram': row[16],
                'youtube': row[17],
                'latest_battles': json.loads(row[18]) if row[18] else []
            }
            self.send_json(emcee)

        # Get all videos
        elif path == '/api/videos':
            limit = int(query.get('limit', [50])[0])
            offset = int(query.get('offset', [0])[0])
            search = query.get('search', [''])[0]
            sort = query.get('sort', ['views'])[0]

            sql = "SELECT id, videoId, title, publishedAt, thumbnail, views, likes, comments, url FROM videos WHERE 1=1"
            params = []

            if search:
                sql += " AND title LIKE ?"
                params.append(f'%{search}%')

            valid_sorts = {'views', 'likes', 'comments', 'publishedAt'}
            if sort not in valid_sorts:
                sort = 'views'

            sql += f" ORDER BY {sort} DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])

            cursor = video_conn.cursor()
            cursor.execute(sql, params)
            rows = cursor.fetchall()

            videos = []
            for row in rows:
                videos.append({
                    'id': row[0],
                    'videoId': row[1],
                    'title': row[2],
                    'publishedAt': row[3],
                    'thumbnail': row[4],
                    'views': row[5],
                    'likes': row[6],
                    'comments': row[7],
                    'url': row[8]
                })

            self.send_json({'videos': videos})

        # Get videos for specific emcee
        elif path.startswith('/api/videos/emcee/'):
            emcee_name = path.split('/')[-1]
            limit = int(query.get('limit', [20])[0])

            cursor = video_conn.cursor()
            cursor.execute("""
                SELECT id, videoId, title, publishedAt, thumbnail, views, likes, comments, url
                FROM videos
                WHERE title LIKE ? OR title LIKE ?
                ORDER BY views DESC LIMIT ?
            """, (f'%{emcee_name}% vs %', f'%vs {emcee_name}%', limit))
            rows = cursor.fetchall()

            videos = []
            for row in rows:
                videos.append({
                    'id': row[0],
                    'videoId': row[1],
                    'title': row[2],
                    'publishedAt': row[3],
                    'thumbnail': row[4],
                    'views': row[5],
                    'likes': row[6],
                    'comments': row[7],
                    'url': row[8]
                })

            self.send_json({'videos': videos, 'emcee': emcee_name})

        # Get divisions
        elif path == '/api/divisions':
            cursor = emcees_conn.cursor()
            cursor.execute("SELECT DISTINCT division FROM emcees WHERE division IS NOT NULL AND division != '' ORDER BY division")
            divisions = [row[0] for row in cursor.fetchall()]
            self.send_json({'divisions': divisions})

        # Get stats
        elif path == '/api/stats':
            emcee_cursor = emcees_conn.cursor()
            video_cursor = video_conn.cursor()

            emcee_cursor.execute("SELECT COUNT(*) FROM emcees")
            emcee_count = emcee_cursor.fetchone()[0]

            video_cursor.execute("SELECT COUNT(*) FROM videos")
            video_count = video_cursor.fetchone()[0]

            video_cursor.execute("SELECT SUM(views) FROM videos")
            total_views = video_cursor.fetchone()[0] or 0

            emcee_cursor.execute("SELECT division, COUNT(*) as cnt FROM emcees GROUP BY division ORDER BY cnt DESC")
            divisions = [{'name': row[0], 'count': row[1]} for row in emcee_cursor.fetchall()]

            self.send_json({
                'total_emcees': emcee_count,
                'total_videos': video_count,
                'total_views': total_views,
                'divisions': divisions
            })

        else:
            self.send_json({'error': 'Not found'}, 404)

    def end_headers(self):
        super().end_headers()

if __name__ == '__main__':
    server = HTTPServer(('localhost', 8080), APIHandler)
    print('FlipTop API running on http://localhost:8080')
    server.serve_forever()
