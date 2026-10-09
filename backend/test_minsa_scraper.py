import httpx
import re
import json

def fetch_minsa_data(cpt_codigo="87207", ipress_name="", ups="0", tipo_tarifa="0", cmb_institucion="0", cmb_departamento="0", cmb_categoria="0"):
    url_get = "https://costosytarifas.minsa.gob.pe/observatorio_costos/resumen/"
    url_post = "https://costosytarifas.minsa.gob.pe/observatorio_costos/resumen"

    with httpx.Client(verify=False, follow_redirects=True, timeout=25.0) as client:
        client.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        })
        res_get = client.get(url_get)
        csrf_match = re.search(r'name=["\']csrf_token["\']\s+value=["\']([^"\']+)["\']', res_get.text)
        csrf_token = csrf_match.group(1) if csrf_match else ""

        payload = {
            "csrf_token": csrf_token,
            "ipress_name": ipress_name,
            "ups": ups,
            "tipo_tarifa": tipo_tarifa,
            "cmb_institucion": cmb_institucion,
            "cpt_codigo": cpt_codigo,
            "cpt_name": "",
            "cmb_departamento": cmb_departamento,
            "cmb_categoria": cmb_categoria
        }

        headers_post = {
            "Referer": url_get,
            "Origin": "https://costosytarifas.minsa.gob.pe",
            "Content-Type": "application/x-www-form-urlencoded"
        }

        res_post = client.post(url_post, data=payload, headers=headers_post)
        try:
            return res_post.json()
        except Exception:
            return []

if __name__ == "__main__":
    for code in ["87207", "85025", "99201"]:
        res = fetch_minsa_data(code)
        valid_tariffs = [r for r in res if r.get("tarifa") and float(r.get("tarifa") or 0) > 0]
        print(f"Code {code}: Total={len(res)}, Con tarifa={len(valid_tariffs)}")
        if valid_tariffs:
            prices = [float(r["tarifa"]) for r in valid_tariffs]
            print(f"  Precios min={min(prices)}, max={max(prices)}, prom={round(sum(prices)/len(prices), 2)}")
            print(f"  Ejemplo: IPRESS={valid_tariffs[0]['ipress']} | Tipo={valid_tariffs[0]['tipo_tarifa']} | Tarifa=S/. {valid_tariffs[0]['tarifa']}")
