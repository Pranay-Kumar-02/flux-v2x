from fastapi import APIRouter
from app.api.v1 import (
    auth,
    datasets,
    schemas,
    context,
    experiments,
    acafdm,
    simulator,
    benchmarks,
    health,
    jobs,
    sumo,
    cosim,
)

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(datasets.router)
api_router.include_router(schemas.router)
api_router.include_router(context.router)
api_router.include_router(experiments.router)
api_router.include_router(acafdm.router)
api_router.include_router(simulator.router)
api_router.include_router(benchmarks.router)
api_router.include_router(jobs.router)
api_router.include_router(sumo.router)
api_router.include_router(cosim.router)
