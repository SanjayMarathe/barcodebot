#!/usr/bin/env python3
"""
Run the Property Finder ASI1 agent.
Usage (from this directory):
  python3 run_agent.py
Or from project root (Property Finder):
  python3 property_finder/run_agent.py
"""

import sys
from pathlib import Path

# Project root = parent of property_finder (so "property_finder" is a package)
_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

if __name__ == "__main__":
    from property_finder.asi1_agent.property_agent import agent

    print("Property Finder agent address:", agent.address)
    agent.run()
