#!/bin/bash

# Phase 2 Supervisor Monitoring Script
echo "=== ClawCity Phase 2 Supervisor Monitor ==="
echo "Monitoring 3 sub-agents: Task 9 (Economy), Task 10 (Social), Task 11 (Governance)"
echo ""

while true; do
    clear
    echo "=== Phase 2 Progress Monitor - $(date) ==="
    echo ""
    
    # Check process status
    echo "📊 Process Status:"
    echo "• Task 9 (Economy):    $(ps -p 74254 >/dev/null 2>&1 && echo "🟢 RUNNING" || echo "🔴 STOPPED")"
    echo "• Task 10 (Social):    $(ps -p 74264 >/dev/null 2>&1 && echo "🟢 RUNNING" || echo "🔴 STOPPED")"
    echo "• Task 11 (Governance): $(ps -p 74268 >/dev/null 2>&1 && echo "🟢 RUNNING" || echo "🔴 STOPPED")"
    echo ""
    
    # Check git status
    echo "📂 Git Status:"
    cd ~/asktinnguyen/clawcity
    if [ -n "$(git status --porcelain)" ]; then
        echo "🔄 Changes detected:"
        git status --porcelain | head -10
    else
        echo "✨ Working tree clean"
    fi
    echo ""
    
    # Check recent commits
    echo "📝 Recent Commits:"
    git log --oneline -5 | head -5
    echo ""
    
    sleep 60
done