import httpx
import re

url_get = "https://costosytarifas.minsa.gob.pe/observatorio_costos/resumen/"
url_post = "https://costosytarifas.minsa.gob.pe/observatorio_costos/resumen"

client = httpx.Client(
    verify=False,
    follow_redirects=True,
    headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    timeout=30.0
)

res_get = client.get(url_get)
csrf_match = re.search(r'name=["\']csrf_token["\']\s+value=["\']([^"\']+)["\']', res_get.text)
csrf_token = csrf_match.group(1) if csrf_match else ""

payload = {
    "csrf_token": csrf_token,
    "ipress_name": "",
    "ups": "0",
    "tipo_tarifa": "0",
    "cmb_institucion": "0",
    "cpt_codigo": "87207",
    "cpt_name": "",
    "cmb_departamento": "0",
    "cmb_categoria": "0"
}

res_post = client.post(url_post, data=payload, headers={
    "Referer": url_get,
    "Origin": "https://costosytarifas.minsa.gob.pe",
    "Content-Type": "application/x-www-form-urlencoded"
})

with open("backend/minsa_post_response.html", "w", encoding="utf-8") as f:
    f.write(res_post.text)

print("Saved minsa_post_response.html (length:", len(res_post.text), ")")

# Search for common data patterns or tables in the HTML
if "<table" in res_post.text.lower():
    print("Found <table in response!")
else:
    print("No <table tag found directly.")

# Search for class names, cards, or scripts with data
scripts = re.findall(r'<script[^>]*>(.*?)</script>', res_post.text, re.DOTALL | re.I)
print(f"Found {len(scripts)} script tags")
for idx, s in enumerate(scripts):
    if "87207" in s or "data" in s.lower() or "table" in s.lower():
        print(f"Script {idx} snippet:", s[:300])

# Check for divs with results
if "87207" in res_post.text:
    print("87207 appears in response HTML!")
    matches = re.findall(r'.{0,100}87207.{0,100}', res_post.text)
    for m in matches[:5]:
        print("  Match:", m.strip())
