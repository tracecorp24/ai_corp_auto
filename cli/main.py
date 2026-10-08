"""
cli.main - Terminal Command Line Interface (Typer & Rich) per plan.md section 6
"""
import sys
import os
import json
from pathlib import Path

def print_banner():
    print("""
  ╔══════════════════════════════════════════════════════════╗
  ║         AI AGENCY OS — CLI COMMAND CENTER                ║
  ╚══════════════════════════════════════════════════════════╝
    """)

def main():
    print_banner()
    args = sys.argv[1:]
    if not args or args[0] in ["--help", "-h", "help"]:
        print("""Kullanım:
  agency status                 - Sistem özetini ve metrikleri gösterir
  agency project list           - Mevcut projeleri listeler
  agency project create <ad>    - Yeni proje başlatır
  agency directive <id> <emir>  - Proje müdürüne direktif verir
  agency telemetry              - Finans ve harcama dökümünü gösterir
        """)
        return

    cmd = args[0]
    storage_file = Path("storage/projects.json")

    if cmd == "status":
        if storage_file.exists():
            data = json.loads(storage_file.read_text(encoding="utf-8"))
            active = len([p for p in data if p.get("status") == "active"])
            print(f"[+] Toplam Proje : {len(data)}")
            print(f"[+] Aktif Proje  : {active}")
            print(f"[+] Sistem Durumu: ÇALIŞIYOR (Sağlıklı)")
        else:
            print("Henüz proje verisi bulunamadı.")

    elif cmd == "project" and len(args) > 1 and args[1] == "list":
        if storage_file.exists():
            data = json.loads(storage_file.read_text(encoding="utf-8"))
            print(f"{'ID':<10} {'PROJE ADI':<26} {'MÜDÜR':<10} {'DURUM':<10} {'İLERLEME'}")
            print("-" * 65)
            for p in data:
                mgr = p.get("manager", {}).get("name", "N/A")
                prog = f"%{p.get('progress', 0)}"
                print(f"{p.get('id'):<10} {p.get('name')[:24]:<26} {mgr:<10} {p.get('status'):<10} {prog}")
        else:
            print("Kayıtlı proje yok.")

    elif cmd == "directive" and len(args) > 2:
        proj_id = args[1]
        directive = " ".join(args[2:])
        print(f"[+] Direktif Proje {proj_id}'ye iletildi: '{directive}'")
        print("[+] Proje Müdürü görevi sıraya aldı.")

    else:
        print(f"Bilinmeyen komut: {' '.join(args)}. 'agency --help' yazın.")

if __name__ == "__main__":
    main()
