"""Inference Worker Daemon (Stub).

Polls PostgreSQL job queue using SELECT ... FOR UPDATE SKIP LOCKED
and executes BERT + regression head inference.
"""
import time
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("inference_worker")


def main():
    logger.info("Starting AES Inference Worker Daemon...")
    logger.info("Ready to poll for SCORING jobs.")
    try:
        while True:
            # Placeholder for job polling loop
            time.sleep(5)
    except KeyboardInterrupt:
        logger.info("Shutting down worker...")


if __name__ == "__main__":
    main()
