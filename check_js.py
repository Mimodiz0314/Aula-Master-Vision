import urllib.request, re
try:
    with urllib.request.urlopen('https://aulamaster-frontend.onrender.com/') as r:
        html = r.read().decode()
        match = re.search(r'src=\"(/assets/index-[^\"]+\.js)\"', html)
        if match:
            js_url = 'https://aulamaster-frontend.onrender.com' + match.group(1)
            print('JS URL:', js_url)
            with urllib.request.urlopen(js_url) as r2:
                js = r2.read().decode()
                if 'aulamaster-backend.onrender.com' in js:
                    idx = js.find('aulamaster-backend.onrender.com')
                    print('FOUND DOMAIN AT:', js[max(0,idx-20):idx+50])
                else:
                    print('DOMAIN NOT FOUND IN JS')
        else:
            print('NO JS MATCH')
except Exception as e:
    print('Failed', e)
