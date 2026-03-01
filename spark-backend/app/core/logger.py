import logging
import sys
from pythonjsonlogger import jsonlogger

logger = logging.getLogger("spark-backend")
logger.setLevel(logging.INFO)

log_handler = logging.StreamHandler(sys.stdout)

formatter = jsonlogger.JsonFormatter(
    fmt='%(asctime)s %(levelname)s %(name)s %(message)s'
)
log_handler.setFormatter(formatter)
logger.addHandler(log_handler)