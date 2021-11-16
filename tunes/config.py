import os

import yaml


def _init():
    config_file = os.environ.get('TUNES_CONFIG', 'config.test.yaml')
    with open(config_file) as f:
        config_data = yaml.safe_load(f)
    for k, v in config_data.items():
        globals()[k.upper()] = v


_init()
