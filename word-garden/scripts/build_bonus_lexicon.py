#!/usr/bin/env python3
"""Rebuild the reviewed offline bonus lexicon from pinned public sources.

Development only: pip install wordfreq==3.1.1. The game never imports wordfreq,
downloads a dictionary, or uses this script at runtime.
"""

from collections import Counter
import hashlib
import io
import json
from pathlib import Path
import re
from urllib.request import urlopen
import zipfile

from wordfreq import zipf_frequency


ROOT = Path(__file__).resolve().parents[1]
URL = "https://github.com/en-wl/wordlist/releases/download/rel-2026.02.25/hunspell-en_US-2026.02.25.zip"
SHA256 = "ac8e73310e951d88c52c2cf2ba54ceaca34f8486a81630ac8a75dc5f931179f9"
FAMILIES = ROOT / "data" / "families.json"
EXCLUSIONS = ROOT / "data" / "bonus-exclusions.txt"
ADDITIONS = ROOT / "data" / "bonus-additions.txt"
OUTPUT = ROOT / "data" / "bonus-lexicon.txt"


def affix_rules(affix_file):
    rules = {}
    for line in affix_file.splitlines():
        parts = line.split()
        if len(parts) != 5 or parts[0] not in ("SFX", "PFX"):
            continue
        kind, flag, strip, add, condition = parts
        rules.setdefault(flag, []).append((kind, strip, add.split("/")[0], condition))
    return rules


def expanded_forms(spelling, flags, rules):
    yield spelling
    for flag in flags:
        for kind, strip, add, condition in rules.get(flag, []):
            if strip != "0" and (not spelling.endswith(strip) if kind == "SFX" else not spelling.startswith(strip)):
                continue
            if not re.search(f"^(?:{condition})" if kind == "PFX" else f"(?:{condition})$", spelling):
                continue
            if kind == "SFX":
                yield spelling[:len(spelling) - len(strip)] + ("" if add == "0" else add) if strip != "0" else spelling + ("" if add == "0" else add)
            else:
                yield ("" if add == "0" else add) + spelling[len(strip):] if strip != "0" else ("" if add == "0" else add) + spelling


def main():
    archive = urlopen(URL).read()
    assert hashlib.sha256(archive).hexdigest() == SHA256, "ESDB source checksum changed"
    with zipfile.ZipFile(io.BytesIO(archive)) as source:
        entries = source.read("en_US.dic").decode("utf-8").splitlines()[1:]
        rules = affix_rules(source.read("en_US.aff").decode("utf-8"))
    families = json.loads(FAMILIES.read_text())
    racks = [Counter(family["letters"]) for family in families]
    excluded = {line for line in EXCLUSIONS.read_text().splitlines() if line and not line.startswith("#")}
    added = {line for line in ADDITIONS.read_text().splitlines() if line and not line.startswith("#")}
    lexicon = set()
    for entry in entries:
        spelling, _, flags = entry.partition("/")
        if not re.fullmatch(r"[a-z]{2,6}", spelling):
            continue
        for form in expanded_forms(spelling, flags, rules):
            if not re.fullmatch(r"[a-z]{3,6}", form):
                continue
            word = form.upper()
            if word in excluded or zipf_frequency(form, "en") < 3.0:
                continue
            if any(not Counter(word) - rack for rack in racks):
                lexicon.add(word)
    # Curated answer words remain recognizable when used as a bonus on another
    # rack, even if the Hunspell entry or frequency threshold omitted them.
    lexicon.update(word for family in families for word in family["required"])
    assert all(re.fullmatch(r"[A-Z]{3,6}", word) and any(not Counter(word) - rack for rack in racks) for word in added)
    lexicon.update(added)
    lexicon.difference_update(excluded)
    OUTPUT.write_text("\n".join(sorted(lexicon)) + "\n")
    print(f"Wrote {len(lexicon)} reviewed ESDB words to {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
