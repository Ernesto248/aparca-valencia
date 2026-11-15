from __future__ import annotations

import argparse
import asyncio
import json

from app.core.config import settings
from app.integrations.arcgis import ArcGISClient
from app.integrations.regulated import RegulatedPredictionAdapter
from app.services.importer import UnregulatedParkingImporter


async def sync_unregulated() -> None:
    run_id = await UnregulatedParkingImporter().run()
    print(json.dumps({"status": "success", "run_id": str(run_id)}))


async def sync_regulated(horizon: int) -> None:
    if not settings.enable_regulated_predictions:
        raise SystemExit("ENABLE_REGULATED_PREDICTIONS debe estar activado")
    client = ArcGISClient(settings.arcgis_base_url)
    try:
        records = await RegulatedPredictionAdapter(client).fetch(horizon)
    finally:
        await client.close()
    print(json.dumps({"status": "success", "records": len(records), "horizon": horizon}))


def main() -> None:
    parser = argparse.ArgumentParser(prog="aparca-api")
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("sync-unregulated")
    regulated = subparsers.add_parser("sync-regulated")
    regulated.add_argument("--horizon", type=int, choices=(1, 6, 12, 24), required=True)
    args = parser.parse_args()
    if args.command == "sync-unregulated":
        asyncio.run(sync_unregulated())
    else:
        asyncio.run(sync_regulated(args.horizon))


if __name__ == "__main__":
    main()
