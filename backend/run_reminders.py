"""Cron entrypoint:  python run_reminders.py plan|exam|streak|all"""
import sys
from dotenv import load_dotenv

load_dotenv()
import reminders  # noqa: E402  (after load_dotenv so DATABASE_URL/APP_TIMEZONE are set)


def main(argv):
    which = argv[1] if len(argv) > 1 else "all"
    if which != "all" and which not in reminders.JOBS:
        print(f"usage: run_reminders.py [{'|'.join(reminders.JOBS)}|all]")
        return 2
    for name in (reminders.JOBS if which == "all" else [which]):
        print(f"[reminders] {name}: {reminders.JOBS[name]()} notification(s) created")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
