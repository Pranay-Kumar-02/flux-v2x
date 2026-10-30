#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
echo "Compiling NS-3 Co-Simulation Runner..."
g++ -O2 ns3_cosim_runner.cpp $(pkg-config --cflags --libs ns3-core ns3-network ns3-mobility ns3-wifi ns3-internet ns3-applications ns3-flow-monitor) -o ns3_runner
echo "Build complete:"
ls -lh ns3_runner

