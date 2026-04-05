"""
Ensure research-synthesis-team/ is on sys.path so local modules are importable.
"""

import sys
import os

parent = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent not in sys.path:
    sys.path.insert(0, parent)
