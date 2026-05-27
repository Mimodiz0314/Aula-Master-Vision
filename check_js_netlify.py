import urllib.request, re
try:
    with urllib.request.urlopen('https://adorable-liger-d3746a.netlify.app/') as r:
        html = r.read().decode()
        match = re.search(r'src=\"(/assets/index-[^\"]+\.js)\"', html)
        if match:
            js_url = 'https://adorable-liger-d3746a.netlify.app' + match.group(1)
            with urllib.request.urlopen(js_url) as r2:
                js = r2.read().decode()
                if 'aulamaster-backend.onrender.com' in js:
                    idx = js.find('aulamaster-backend.onrender.com')
                    print('NETLIFY DOMAIN AT:', js[max(0,idx-20):idx+50])
                else:
                    print('DOMAIN NOT FOUND IN NETLIFY JS')
except Exception as e:
    print('Failed', e)
