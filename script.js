/**
 * Smart Network Routing Simulator Using Dijkstra's Algorithm
 * 
 * Features:
 * - Interactive vis-network graph visualization (drag, zoom, pan)
 * - Full Dijkstra's Algorithm implementation with microsecond benchmarking
 * - Shortest path glowing highlight & dimmed alternate paths
 * - Smooth 📦 packet animation along the computed route (canvas-synchronized)
 * - Dynamic link traffic states (Low, Medium, High) with delay overheads
 * - Link failure simulation & automatic OSPF-like route reconvergence
 * - Dynamic routing tables per router
 * - Real-time network statistics with animated counter transitions
 * - Router search with auto-focus & zoom
 * - Exportable audit report (.txt)
 * - Dark / Light theme toggle with persisted preference
 * - Toast notification feedback system
 */

// ==========================================================================
// 1. Global State & Configuration
// ==========================================================================
const AppState = {
  network: null,
  nodes: new vis.DataSet([]),
  edges: new vis.DataSet([]),
  physicsEnabled: true,
  currentShortestPath: [],
  selectedSource: null,
  selectedDest: null,
  currentReportData: null,
  
  // Packet Animation State
  animation: {
    active: false,
    pathNodeIds: [],
    currentEdgeIndex: 0,
    progress: 0, // 0 to 1 along current edge
    speed: 0.015, // speed per frame
    rafId: null
  },

  // Color Schemes for Dark & Light Themes
  themes: {
    dark: {
      nodeBg: '#1e293b',
      nodeBorder: '#00f2fe',
      nodeHighlightBg: '#0f766e',
      nodeHighlightBorder: '#00f5a0',
      nodeText: '#ffffff',
      edgeDefault: 'rgba(148, 163, 184, 0.4)',
      edgeLabelBg: 'rgba(15, 23, 42, 0.85)',
      edgeLabelColor: '#38bdf8',
      pathHighlight: '#00f5a0',
      dimmedEdge: 'rgba(71, 85, 105, 0.18)'
    },
    light: {
      nodeBg: '#ffffff',
      nodeBorder: '#0284c7',
      nodeHighlightBg: '#d1fae5',
      nodeHighlightBorder: '#10b981',
      nodeText: '#0f172a',
      edgeDefault: 'rgba(100, 116, 139, 0.45)',
      edgeLabelBg: 'rgba(255, 255, 255, 0.9)',
      edgeLabelColor: '#0284c7',
      pathHighlight: '#10b981',
      dimmedEdge: 'rgba(203, 213, 225, 0.25)'
    }
  }
};

// ==========================================================================
// 2. DOM Elements Cache
// ==========================================================================
const DOM = {
  themeToggleBtn: document.getElementById('theme-toggle-btn'),
  networkStatusBadge: document.getElementById('network-status-badge'),
  networkStatusText: document.getElementById('network-status-text'),
  routerSearchInput: document.getElementById('router-search-input'),
  routerSearchClear: document.getElementById('router-search-clear'),
  
  // Control Panel
  btnAddRouter: document.getElementById('btn-add-router'),
  btnConnectRouters: document.getElementById('btn-connect-routers'),
  btnSampleNetwork: document.getElementById('btn-sample-network'),
  btnRandomNetwork: document.getElementById('btn-random-network'),
  btnSimulateTraffic: document.getElementById('btn-simulate-traffic'),
  btnSimulateFailure: document.getElementById('btn-simulate-failure'),
  btnRestoreLinks: document.getElementById('btn-restore-links'),
  btnResetNetwork: document.getElementById('btn-reset-network'),
  btnExportReport: document.getElementById('btn-export-report'),
  btnFitCanvas: document.getElementById('btn-fit-canvas'),
  btnTogglePhysics: document.getElementById('btn-toggle-physics'),
  physicsStatus: document.getElementById('physics-status'),
  
  // Route Finder
  selectSource: document.getElementById('select-source-router'),
  selectDest: document.getElementById('select-dest-router'),
  btnFindPath: document.getElementById('btn-find-path'),
  btnAnimatePacket: document.getElementById('btn-animate-packet'),
  
  // Canvas Controls
  networkCanvas: document.getElementById('network-canvas'),
  btnZoomIn: document.getElementById('btn-zoom-in'),
  btnZoomOut: document.getElementById('btn-zoom-out'),
  btnCenterGraph: document.getElementById('btn-center-graph'),
  canvasSpinner: document.getElementById('canvas-spinner'),
  
  // Results Panel
  resultPath: document.getElementById('result-shortest-path'),
  resultCost: document.getElementById('result-total-cost'),
  resultHops: document.getElementById('result-hops'),
  resultDelay: document.getElementById('result-delay'),
  resultExecTime: document.getElementById('result-exec-time'),
  protocolText: document.getElementById('protocol-used-text'),
  
  // Statistics
  statRouters: document.getElementById('stat-total-routers'),
  statLinks: document.getElementById('stat-total-links'),
  statAvgCost: document.getElementById('stat-avg-cost'),
  statDensity: document.getElementById('stat-density'),
  
  // Routing Table
  tableSourceFilter: document.getElementById('table-source-filter'),
  routingTableBody: document.getElementById('routing-table-body'),
  
  // Educational Accordion
  accordionToggleBtn: document.getElementById('accordion-toggle-btn'),
  accordionContent: document.getElementById('accordion-content-panel'),
  accordionChevron: document.getElementById('accordion-chevron'),
  
  // Modals
  modalAddRouter: document.getElementById('modal-add-router'),
  modalAddRouterClose: document.getElementById('modal-add-router-close'),
  modalAddRouterCancel: document.getElementById('modal-add-router-cancel'),
  formAddRouter: document.getElementById('form-add-router'),
  inputRouterId: document.getElementById('input-router-id'),
  inputRouterIp: document.getElementById('input-router-ip'),
  
  modalConnect: document.getElementById('modal-connect-routers'),
  modalConnectClose: document.getElementById('modal-connect-close'),
  modalConnectCancel: document.getElementById('modal-connect-cancel'),
  formConnect: document.getElementById('form-connect-routers'),
  connectNode1: document.getElementById('connect-node-1'),
  connectNode2: document.getElementById('connect-node-2'),
  inputLinkCost: document.getElementById('input-link-cost'),
  
  // Toast Container
  toastContainer: document.getElementById('toast-container')
};

// ==========================================================================
// 3. Application Initialization
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initVisNetwork();
  initEventListeners();
  loadSampleNetwork(); // Default predefined topology
  showToast('Welcome to Smart Network Routing Simulator', 'info');
});

/**
 * Initializes Theme based on localStorage or dark default
 */
function initTheme() {
  const savedTheme = localStorage.getItem('snr_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
}

/**
 * Toggles Dark and Light Theme
 */
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('snr_theme', next);
  
  // Re-style existing nodes/edges for new theme
  refreshGraphStyles();
  showToast(`Switched to ${next} mode`, 'info');
}

// ==========================================================================
// 4. Graph Visualization (vis-network Setup)
// ==========================================================================
function initVisNetwork() {
  const container = DOM.networkCanvas;
  const data = {
    nodes: AppState.nodes,
    edges: AppState.edges
  };

  const options = {
    nodes: {
      shape: 'box',
      margin: 12,
      borderWidth: 2,
      shadow: {
        enabled: true,
        color: 'rgba(0,0,0,0.35)',
        size: 10,
        x: 3,
        y: 4
      },
      font: {
        face: 'Inter',
        size: 14,
        color: '#ffffff',
        bold: { color: '#ffffff', size: 14 }
      }
    },
    edges: {
      width: 2.5,
      smooth: {
        type: 'continuous',
        roundness: 0.15
      },
      shadow: {
        enabled: true,
        color: 'rgba(0,0,0,0.25)',
        size: 6,
        x: 2,
        y: 2
      },
      font: {
        face: 'Fira Code',
        size: 12,
        align: 'middle',
        strokeWidth: 0,
        background: 'rgba(15, 23, 42, 0.85)'
      }
    },
    physics: {
      enabled: true,
      solver: 'forceAtlas2Based',
      forceAtlas2Based: {
        gravitationalConstant: -70,
        centralGravity: 0.015,
        springLength: 160,
        springConstant: 0.08,
        damping: 0.4
      },
      stabilization: {
        iterations: 150,
        updateInterval: 25
      }
    },
    interaction: {
      hover: true,
      tooltipDelay: 120,
      zoomView: true,
      dragView: true,
      dragNodes: true,
      selectConnectedEdges: false
    }
  };

  AppState.network = new vis.Network(container, data, options);

  // Sync canvas drawing hook for 📦 packet animation
  AppState.network.on('afterDrawing', (ctx) => {
    drawAnimatedPacket(ctx);
  });

  // Graph click handlers
  AppState.network.on('click', (params) => {
    if (params.nodes.length > 0) {
      const clickedNode = params.nodes[0];
      handleNodeClick(clickedNode);
    }
  });

  // Update statistics whenever dataset changes
  AppState.nodes.on('*', () => updateNetworkStats());
  AppState.edges.on('*', () => updateNetworkStats());
}

/**
 * Returns theme colors according to the current active theme
 */
function getActiveThemeColors() {
  const theme = document.documentElement.getAttribute('data-theme') || 'dark';
  return AppState.themes[theme] || AppState.themes.dark;
}

/**
 * Creates node visual styling object
 */
function createNodeStyle(id, customLabel, ip) {
  const theme = getActiveThemeColors();
  const nodeIp = ip || `192.168.1.${Math.floor(Math.random() * 200) + 10}`;
  
  // HTML Tooltip formatted for rich router telemetry
  const tooltipHtml = `
    <div style="padding: 8px 12px; font-family: Inter, sans-serif; font-size: 12px; color: #f8fafc; line-height: 1.5; background: #0f172a; border-radius: 8px; border: 1px solid #00f2fe; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
      <div style="font-weight: 700; color: #00f2fe; font-size: 13px; margin-bottom: 4px;">🖧 ${customLabel || id}</div>
      <div><strong>Role:</strong> Core Router (OSI Layer 3)</div>
      <div><strong>IP:</strong> <span style="font-family: monospace; color: #00f5a0;">${nodeIp}</span></div>
      <div><strong>Neighbors:</strong> ${getNodeNeighborCount(id)} connections</div>
      <div><strong>Status:</strong> <span style="color: #00f5a0;">● Active</span></div>
    </div>
  `;

  return {
    id: id,
    label: `🖧 ${customLabel || id}\n[${nodeIp}]`,
    title: tooltipHtml,
    ip: nodeIp,
    color: {
      background: theme.nodeBg,
      border: theme.nodeBorder,
      highlight: {
        background: theme.nodeHighlightBg,
        border: theme.nodeHighlightBorder
      },
      hover: {
        background: theme.nodeBg,
        border: '#00f5a0'
      }
    },
    font: {
      color: theme.nodeText,
      size: 13,
      bold: { color: theme.nodeText, size: 13 }
    }
  };
}

/**
 * Returns neighbor count for a specific node ID
 */
function getNodeNeighborCount(nodeId) {
  const allEdges = AppState.edges.get();
  return allEdges.filter(e => (e.from === nodeId || e.to === nodeId) && !e.failed).length;
}

/**
 * Creates edge visual styling object
 */
function createEdgeStyle(from, to, cost, customId) {
  const theme = getActiveThemeColors();
  const edgeId = customId || `${from}-${to}`;
  const baseWeight = parseInt(cost, 10) || 1;

  return {
    id: edgeId,
    from: from,
    to: to,
    baseCost: baseWeight,
    cost: baseWeight,
    trafficState: 'low',
    failed: false,
    label: `Cost: ${baseWeight}`,
    width: 2.5,
    color: {
      color: theme.edgeDefault,
      highlight: theme.nodeBorder,
      hover: theme.nodeBorder
    },
    font: {
      color: theme.edgeLabelColor,
      background: theme.edgeLabelBg,
      size: 12
    },
    dashes: false
  };
}

/**
 * Updates graph visual styling when theme changes
 */
function refreshGraphStyles() {
  const theme = getActiveThemeColors();
  
  // Refresh nodes
  const updatedNodes = AppState.nodes.get().map(node => ({
    id: node.id,
    color: {
      background: theme.nodeBg,
      border: theme.nodeBorder,
      highlight: {
        background: theme.nodeHighlightBg,
        border: theme.nodeHighlightBorder
      }
    },
    font: {
      color: theme.nodeText
    }
  }));
  AppState.nodes.update(updatedNodes);

  // Refresh edges (preserving path highlight if present)
  resetGraphPathHighlights();
}

// ==========================================================================
// 5. Topology Management (Sample, Random, Custom)
// ==========================================================================

/**
 * FUNCTIONAL REQUIREMENT 1: Sample Network
 * Predefined topology:
 * A-B = 4
 * A-C = 2
 * B-C = 3
 * B-D = 1
 * C-D = 5
 */
function loadSampleNetwork() {
  stopPacketAnimation();
  AppState.nodes.clear();
  AppState.edges.clear();
  setNetworkStatus('Online / Topology Loaded', 'normal');

  // Predefined nodes with fixed positions for clear visual layout
  const sampleNodes = [
    { id: 'A', name: 'Router A', ip: '192.168.1.1', x: -260, y: 0 },
    { id: 'B', name: 'Router B', ip: '192.168.1.2', x: 0, y: -160 },
    { id: 'C', name: 'Router C', ip: '192.168.1.3', x: 0, y: 160 },
    { id: 'D', name: 'Router D', ip: '192.168.1.4', x: 260, y: 0 }
  ];

  sampleNodes.forEach(n => {
    const nodeObj = createNodeStyle(n.id, n.name, n.ip);
    nodeObj.x = n.x;
    nodeObj.y = n.y;
    AppState.nodes.add(nodeObj);
  });

  // Predefined links with required costs:
  // A-B = 4, A-C = 2, B-C = 3, B-D = 1, C-D = 5
  const sampleEdges = [
    { from: 'A', to: 'B', cost: 4 },
    { from: 'A', to: 'C', cost: 2 },
    { from: 'B', to: 'C', cost: 3 },
    { from: 'B', to: 'D', cost: 1 },
    { from: 'C', to: 'D', cost: 5 }
  ];

  sampleEdges.forEach(e => {
    AppState.edges.add(createEdgeStyle(e.from, e.to, e.cost));
  });

  // Populate Dropdowns
  updateRouterDropdowns();
  
  // Set defaults: Source = A, Destination = D
  DOM.selectSource.value = 'A';
  DOM.selectDest.value = 'D';
  DOM.tableSourceFilter.value = 'A';

  // Center Graph
  setTimeout(() => {
    AppState.network.fit({ animation: { duration: 600, easingFunction: 'easeInOutQuad' } });
    calculateAndDisplayRoutingTable('A');
  }, 200);

  resetResultsPanel();
  showToast('Sample Network loaded (A-B=4, A-C=2, B-C=3, B-D=1, C-D=5)', 'success');
}

/**
 * FUNCTIONAL REQUIREMENT 7: Random Network Generator
 * Generates 5 to 10 routers with random link costs and connected topology
 */
function generateRandomNetwork() {
  stopPacketAnimation();
  AppState.nodes.clear();
  AppState.edges.clear();
  setNetworkStatus('Generating Topology...', 'calculating');

  const routerCount = Math.floor(Math.random() * 6) + 5; // 5 to 10 routers
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const generatedNodeIds = letters.slice(0, routerCount);

  // Circular / organic coordinate generation
  const radius = 220;
  generatedNodeIds.forEach((id, index) => {
    const angle = (index / routerCount) * 2 * Math.PI;
    const x = Math.round(radius * Math.cos(angle));
    const y = Math.round(radius * Math.sin(angle));
    const ip = `192.168.10.${index + 1}`;
    
    const nodeObj = createNodeStyle(id, `Router ${id}`, ip);
    nodeObj.x = x;
    nodeObj.y = y;
    AppState.nodes.add(nodeObj);
  });

  // Step 1: Ensure full connectivity via Random Spanning Tree
  const connectedNodes = [generatedNodeIds[0]];
  const remainingNodes = generatedNodeIds.slice(1);

  while (remainingNodes.length > 0) {
    const fromIndex = Math.floor(Math.random() * connectedNodes.length);
    const toIndex = Math.floor(Math.random() * remainingNodes.length);
    
    const fromNode = connectedNodes[fromIndex];
    const toNode = remainingNodes[toIndex];
    const cost = Math.floor(Math.random() * 9) + 1; // 1 to 10
    
    AppState.edges.add(createEdgeStyle(fromNode, toNode, cost));
    
    connectedNodes.push(toNode);
    remainingNodes.splice(toIndex, 1);
  }

  // Step 2: Add extra cross-links for rich alternative paths
  const extraEdgesCount = Math.floor(routerCount * 0.7);
  let added = 0;
  let attempts = 0;

  while (added < extraEdgesCount && attempts < 40) {
    attempts++;
    const idx1 = Math.floor(Math.random() * routerCount);
    const idx2 = Math.floor(Math.random() * routerCount);
    
    if (idx1 !== idx2) {
      const u = generatedNodeIds[idx1];
      const v = generatedNodeIds[idx2];
      
      const exists = AppState.edges.get().some(
        e => (e.from === u && e.to === v) || (e.from === v && e.to === u)
      );

      if (!exists) {
        const cost = Math.floor(Math.random() * 9) + 1;
        AppState.edges.add(createEdgeStyle(u, v, cost));
        added++;
      }
    }
  }

  updateRouterDropdowns();
  DOM.selectSource.value = generatedNodeIds[0];
  DOM.selectDest.value = generatedNodeIds[generatedNodeIds.length - 1];
  DOM.tableSourceFilter.value = generatedNodeIds[0];

  setTimeout(() => {
    AppState.network.fit({ animation: { duration: 600, easingFunction: 'easeInOutQuad' } });
    calculateAndDisplayRoutingTable(generatedNodeIds[0]);
    setNetworkStatus('Online / Ready', 'normal');
  }, 200);

  resetResultsPanel();
  showToast(`Generated random topology with ${routerCount} routers and ${AppState.edges.length} links`, 'success');
}

/**
 * Resets entire network to blank state
 */
function resetNetwork() {
  stopPacketAnimation();
  AppState.nodes.clear();
  AppState.edges.clear();
  AppState.currentShortestPath = [];
  updateRouterDropdowns();
  resetResultsPanel();
  clearRoutingTable();
  setNetworkStatus('Network Empty', 'normal');
  showToast('Network reset to empty canvas', 'warning');
}

/**
 * Adds a new custom router to the network
 */
function handleAddRouter(idInput, ipInput) {
  const cleanId = idInput.trim().toUpperCase();
  if (!cleanId) {
    showToast('Router ID cannot be empty', 'danger');
    return false;
  }

  if (AppState.nodes.get(cleanId)) {
    showToast(`Router with ID '${cleanId}' already exists`, 'danger');
    return false;
  }

  // Random coordinates near center
  const x = Math.floor(Math.random() * 200) - 100;
  const y = Math.floor(Math.random() * 200) - 100;

  const nodeObj = createNodeStyle(cleanId, `Router ${cleanId}`, ipInput);
  nodeObj.x = x;
  nodeObj.y = y;
  AppState.nodes.add(nodeObj);

  updateRouterDropdowns();
  showToast(`Router ${cleanId} added to topology`, 'success');
  return true;
}

/**
 * Connects two existing routers with a weighted link
 */
function handleConnectRouters(node1, node2, cost) {
  if (!node1 || !node2 || node1 === node2) {
    showToast('Please select two distinct routers', 'danger');
    return false;
  }

  const existing = AppState.edges.get().find(
    e => (e.from === node1 && e.to === node2) || (e.from === node2 && e.to === node1)
  );

  if (existing) {
    showToast(`Connection between ${node1} and ${node2} already exists`, 'warning');
    return false;
  }

  const weight = parseInt(cost, 10) || 1;
  AppState.edges.add(createEdgeStyle(node1, node2, weight));
  
  // Refresh node tooltips to reflect updated neighbor counts
  updateAllNodeTooltips();
  
  showToast(`Linked Router ${node1} ↔ Router ${node2} (Cost: ${weight})`, 'success');
  return true;
}

/**
 * Refreshes tooltips for all nodes
 */
function updateAllNodeTooltips() {
  const updated = AppState.nodes.get().map(n => {
    const neighborCount = getNodeNeighborCount(n.id);
    return {
      id: n.id,
      title: `
        <div style="padding: 8px 12px; font-family: Inter, sans-serif; font-size: 12px; color: #f8fafc; line-height: 1.5; background: #0f172a; border-radius: 8px; border: 1px solid #00f2fe; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
          <div style="font-weight: 700; color: #00f2fe; font-size: 13px; margin-bottom: 4px;">🖧 Router ${n.id}</div>
          <div><strong>Role:</strong> Core Router (OSI Layer 3)</div>
          <div><strong>IP:</strong> <span style="font-family: monospace; color: #00f5a0;">${n.ip || '192.168.1.1'}</span></div>
          <div><strong>Neighbors:</strong> ${neighborCount} connections</div>
          <div><strong>Status:</strong> <span style="color: #00f5a0;">● Active</span></div>
        </div>
      `
    };
  });
  AppState.nodes.update(updated);
}

// ==========================================================================
// 6. Dijkstra's Algorithm Implementation
// ==========================================================================

/**
 * Builds adjacency list from active vis-network edges
 * Accounts for link failure and dynamic traffic penalties
 */
function buildAdjacencyList() {
  const adj = new Map();
  const allNodes = AppState.nodes.get();
  allNodes.forEach(node => adj.set(node.id, []));

  const allEdges = AppState.edges.get();
  allEdges.forEach(edge => {
    // Exclude severed/failed links
    if (edge.failed) return;

    const from = edge.from;
    const to = edge.to;
    // Effective metric = base cost + dynamic traffic delay overhead
    const weight = edge.cost || edge.baseCost || 1;

    if (adj.has(from) && adj.has(to)) {
      adj.get(from).push({ neighbor: to, weight: weight, edgeId: edge.id });
      adj.get(to).push({ neighbor: from, weight: weight, edgeId: edge.id });
    }
  });

  return adj;
}

/**
 * FUNCTIONAL REQUIREMENT 2: Dijkstra Algorithm
 * Executes Shortest Path First (SPF) using Dijkstra's Algorithm.
 * Returns shortest path, distance, predecessors, and execution time.
 */
function runDijkstra(sourceId, destId) {
  const startTime = performance.now();
  const adj = buildAdjacencyList();
  const allNodes = AppState.nodes.get();

  const distances = {};
  const previous = {};
  const unvisited = new Set();

  allNodes.forEach(n => {
    distances[n.id] = Infinity;
    previous[n.id] = null;
    unvisited.add(n.id);
  });

  if (!distances.hasOwnProperty(sourceId)) {
    return { path: [], cost: Infinity, execTime: 0, reachable: false };
  }

  distances[sourceId] = 0;

  while (unvisited.size > 0) {
    // Extract node with smallest tentative distance
    let current = null;
    let minDistance = Infinity;

    for (const node of unvisited) {
      if (distances[node] < minDistance) {
        minDistance = distances[node];
        current = node;
      }
    }

    // No reachable remaining unvisited nodes
    if (current === null || minDistance === Infinity) {
      break;
    }

    // Early exit if destination reached
    if (destId && current === destId) {
      break;
    }

    unvisited.delete(current);

    // Neighbor relaxation step
    const neighbors = adj.get(current) || [];
    for (const edge of neighbors) {
      if (unvisited.has(edge.neighbor)) {
        const alt = distances[current] + edge.weight;
        if (alt < distances[edge.neighbor]) {
          distances[edge.neighbor] = alt;
          previous[edge.neighbor] = current;
        }
      }
    }
  }

  const endTime = performance.now();
  const execTime = Math.max(0.01, endTime - startTime).toFixed(3);

  // Reconstruct path from destination back to source
  const path = [];
  if (destId) {
    if (distances[destId] !== Infinity) {
      let curr = destId;
      while (curr !== null) {
        path.unshift(curr);
        curr = previous[curr];
      }
    }
  }

  return {
    path: path,
    cost: destId ? distances[destId] : 0,
    distances: distances,
    previous: previous,
    execTime: execTime,
    reachable: destId ? distances[destId] !== Infinity : true
  };
}

/**
 * Triggers shortest path search between UI dropdown selections
 */
function handleFindShortestPath() {
  const source = DOM.selectSource.value;
  const dest = DOM.selectDest.value;

  if (!source || !dest) {
    showToast('Please select both Source and Destination routers', 'warning');
    return;
  }

  if (source === dest) {
    showToast('Source and Destination cannot be the same router', 'warning');
    return;
  }

  // Show loading spinner briefly for UX
  DOM.canvasSpinner.classList.remove('hidden');
  setNetworkStatus('Computing Shortest Path...', 'calculating');

  setTimeout(() => {
    const result = runDijkstra(source, dest);
    DOM.canvasSpinner.classList.add('hidden');

    if (!result.reachable || result.path.length === 0) {
      setNetworkStatus('Destination Unreachable', 'failure');
      resetResultsPanel(true);
      resetGraphPathHighlights();
      showToast(`No available path between Router ${source} and Router ${dest}`, 'danger');
      return;
    }

    AppState.currentShortestPath = result.path;
    AppState.selectedSource = source;
    AppState.selectedDest = dest;

    // FUNCTIONAL REQUIREMENT 3: Highlight Shortest Path
    highlightShortestPathOnGraph(result.path);

    // Calculate metrics
    const hopCount = result.path.length - 1;
    // Estimated latency (ms) = (Metric Cost * 2.8) + (Hops * 1.5)
    const estimatedLatency = ((result.cost * 2.8) + (hopCount * 1.5)).toFixed(1);

    // Update Results Strip
    updateResultsDisplay(result.path, result.cost, hopCount, estimatedLatency, result.execTime);

    // Update Routing Table for the selected source
    calculateAndDisplayRoutingTable(source);

    setNetworkStatus('Optimal Route Active', 'normal');
    showToast(`Shortest path found: ${result.path.join(' ➔ ')} (Cost: ${result.cost})`, 'success');
  }, 180);
}

// ==========================================================================
// 7. Shortest Path Visualization & Graph Highlighting
// ==========================================================================

/**
 * FUNCTIONAL REQUIREMENT 3: Highlight Shortest Path
 * Shortest path links become vibrant neon green
 * Other links become dimmed translucent gray
 * Path nodes become highlighted
 */
function highlightShortestPathOnGraph(pathNodeIds) {
  const theme = getActiveThemeColors();

  // Create set of path edges
  const pathEdgeSet = new Set();
  for (let i = 0; i < pathNodeIds.length - 1; i++) {
    const u = pathNodeIds[i];
    const v = pathNodeIds[i + 1];
    pathEdgeSet.add(`${u}-${v}`);
    pathEdgeSet.add(`${v}-${u}`);
  }

  // Update edges styling
  const updatedEdges = AppState.edges.get().map(edge => {
    const isPathEdge = pathEdgeSet.has(`${edge.from}-${edge.to}`) || pathEdgeSet.has(`${edge.to}-${edge.from}`);
    
    if (edge.failed) {
      return {
        id: edge.id,
        color: { color: '#f43f5e', highlight: '#f43f5e' },
        width: 2,
        dashes: [6, 6]
      };
    }

    if (isPathEdge) {
      return {
        id: edge.id,
        color: {
          color: theme.pathHighlight,
          highlight: theme.pathHighlight,
          hover: theme.pathHighlight
        },
        width: 5,
        shadow: {
          enabled: true,
          color: theme.pathHighlight,
          size: 15,
          x: 0,
          y: 0
        },
        dashes: false
      };
    } else {
      return {
        id: edge.id,
        color: {
          color: theme.dimmedEdge,
          highlight: theme.dimmedEdge
        },
        width: 1.5,
        shadow: { enabled: false },
        dashes: false
      };
    }
  });

  AppState.edges.update(updatedEdges);

  // Update nodes styling
  const pathNodeSet = new Set(pathNodeIds);
  const updatedNodes = AppState.nodes.get().map(node => {
    const inPath = pathNodeSet.has(node.id);
    const isSource = node.id === pathNodeIds[0];
    const isDest = node.id === pathNodeIds[pathNodeIds.length - 1];

    let borderColor = theme.nodeBorder;
    let bgColor = theme.nodeBg;
    let borderWidth = 2;

    if (isSource) {
      borderColor = '#00f2fe';
      borderWidth = 3;
    } else if (isDest) {
      borderColor = '#00f5a0';
      borderWidth = 3;
    } else if (inPath) {
      borderColor = '#38bdf8';
      borderWidth = 2.5;
    }

    return {
      id: node.id,
      borderWidth: borderWidth,
      color: {
        background: bgColor,
        border: borderColor
      }
    };
  });

  AppState.nodes.update(updatedNodes);
}

/**
 * Resets all edge and node styling back to normal
 */
function resetGraphPathHighlights() {
  const theme = getActiveThemeColors();

  const normalEdges = AppState.edges.get().map(edge => {
    if (edge.failed) {
      return {
        id: edge.id,
        color: { color: '#f43f5e' },
        width: 2,
        dashes: [6, 6]
      };
    }

    return {
      id: edge.id,
      color: {
        color: theme.edgeDefault,
        highlight: theme.nodeBorder,
        hover: theme.nodeBorder
      },
      width: 2.5,
      shadow: { enabled: false },
      dashes: false
    };
  });

  AppState.edges.update(normalEdges);

  const normalNodes = AppState.nodes.get().map(node => ({
    id: node.id,
    borderWidth: 2,
    color: {
      background: theme.nodeBg,
      border: theme.nodeBorder
    }
  }));

  AppState.nodes.update(normalNodes);
}

// ==========================================================================
// 8. FUNCTIONAL REQUIREMENT 4: Packet Animation (📦)
// ==========================================================================

/**
 * Initiates animated packet traversal along the shortest route
 */
function startPacketAnimation() {
  if (!AppState.currentShortestPath || AppState.currentShortestPath.length < 2) {
    showToast('Please find a valid shortest path first before sending packet', 'warning');
    return;
  }

  stopPacketAnimation();

  AppState.animation.active = true;
  AppState.animation.pathNodeIds = [...AppState.currentShortestPath];
  AppState.animation.currentEdgeIndex = 0;
  AppState.animation.progress = 0;
  AppState.animation.speed = 0.02; // Smooth travel speed

  setNetworkStatus('Packet Transmission In Progress...', 'calculating');
  showToast(`Transmitting packet 📦 along ${AppState.animation.pathNodeIds.join(' ➔ ')}`, 'info');

  runPacketAnimationLoop();
}

/**
 * Stops running packet animation
 */
function stopPacketAnimation() {
  AppState.animation.active = false;
  if (AppState.animation.rafId) {
    cancelAnimationFrame(AppState.animation.rafId);
    AppState.animation.rafId = null;
  }
  if (AppState.network) {
    AppState.network.redraw();
  }
}

/**
 * Animation loop driving the packet coordinates
 */
function runPacketAnimationLoop() {
  if (!AppState.animation.active) return;

  AppState.animation.progress += AppState.animation.speed;

  if (AppState.animation.progress >= 1.0) {
    AppState.animation.progress = 0;
    AppState.animation.currentEdgeIndex++;

    // Check if reached final destination router
    if (AppState.animation.currentEdgeIndex >= AppState.animation.pathNodeIds.length - 1) {
      stopPacketAnimation();
      const destId = AppState.animation.pathNodeIds[AppState.animation.pathNodeIds.length - 1];
      setNetworkStatus('Packet Delivered Successfully', 'normal');
      showToast(`Packet delivered safely to Router ${destId}! 🎉`, 'success');
      return;
    }
  }

  // Force vis-network to redraw canvas (which triggers drawAnimatedPacket)
  AppState.network.redraw();

  AppState.animation.rafId = requestAnimationFrame(runPacketAnimationLoop);
}

/**
 * Synchronously renders the packet 📦 on vis-network's internal canvas
 * Perfectly responsive to zoom, pan, and dragging in real-time.
 */
function drawAnimatedPacket(ctx) {
  if (!AppState.animation.active) return;

  const path = AppState.animation.pathNodeIds;
  const edgeIdx = AppState.animation.currentEdgeIndex;
  
  if (edgeIdx >= path.length - 1) return;

  const uId = path[edgeIdx];
  const vId = path[edgeIdx + 1];

  // Retrieve current positions in canvas coordinates
  const posU = AppState.network.getPosition(uId);
  const posV = AppState.network.getPosition(vId);

  if (!posU || !posV) return;

  const t = AppState.animation.progress;

  // Linear interpolation along edge
  const currentX = posU.x + (posV.x - posU.x) * t;
  const currentY = posU.y + (posV.y - posU.y) * t;

  ctx.save();

  // 1. Draw glowing radiant pulse behind packet
  const pulseRadius = 18 + Math.sin(t * Math.PI * 4) * 4;
  const gradient = ctx.createRadialGradient(currentX, currentY, 2, currentX, currentY, pulseRadius);
  gradient.addColorStop(0, 'rgba(0, 245, 160, 0.85)');
  gradient.addColorStop(0.5, 'rgba(0, 242, 254, 0.45)');
  gradient.addColorStop(1, 'rgba(0, 245, 160, 0)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(currentX, currentY, pulseRadius, 0, 2 * Math.PI);
  ctx.fill();

  // 2. Draw Packet Symbol (📦 / Styled Data Box)
  ctx.font = '24px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('📦', currentX, currentY);

  // 3. Draw mini IP packet label badge
  ctx.font = 'bold 9px "Fira Code", monospace';
  ctx.fillStyle = '#0f172a';
  const badgeText = `DATA [${uId}➔${vId}]`;
  const textWidth = ctx.measureText(badgeText).width;
  
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = '#00f5a0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(currentX - textWidth / 2 - 4, currentY - 24, textWidth + 8, 14, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#00f5a0';
  ctx.fillText(badgeText, currentX, currentY - 17);

  ctx.restore();
}

// ==========================================================================
// 9. FUNCTIONAL REQUIREMENT 5: Network Traffic Simulation
// ==========================================================================

/**
 * Randomly assigns traffic states to active links:
 * - Green = Low Traffic (base cost, +0 delay)
 * - Yellow = Medium Traffic (base cost + 2 to 4 delay)
 * - Red = High Traffic (base cost + 6 to 9 delay)
 */
function simulateNetworkTraffic() {
  const allEdges = AppState.edges.get();
  if (allEdges.length === 0) {
    showToast('No links in network to simulate traffic', 'warning');
    return;
  }

  const states = ['low', 'medium', 'high'];
  let mediumCount = 0;
  let highCount = 0;

  const updatedEdges = allEdges.map(edge => {
    if (edge.failed) return edge; // Keep failed links as failed

    // 40% chance low, 35% chance medium, 25% chance high
    const rand = Math.random();
    let state = 'low';
    let delayOverhead = 0;
    let trafficColor = '#10b981';

    if (rand > 0.75) {
      state = 'high';
      delayOverhead = Math.floor(Math.random() * 4) + 6; // +6 to +9
      trafficColor = '#ef4444';
      highCount++;
    } else if (rand > 0.40) {
      state = 'medium';
      delayOverhead = Math.floor(Math.random() * 3) + 2; // +2 to +4
      trafficColor = '#f59e0b';
      mediumCount++;
    }

    const effectiveCost = edge.baseCost + delayOverhead;

    return {
      id: edge.id,
      trafficState: state,
      cost: effectiveCost,
      label: `Cost: ${edge.baseCost} (${state.toUpperCase()}: ${effectiveCost})`,
      font: {
        color: trafficColor,
        background: 'rgba(15, 23, 42, 0.9)'
      }
    };
  });

  AppState.edges.update(updatedEdges);
  setNetworkStatus('Traffic Congestion Simulated', 'traffic');
  showToast(`Traffic load assigned: ${highCount} High (Red), ${mediumCount} Medium (Yellow)`, 'warning');

  // If a shortest path is currently displayed, automatically recalculate
  // to show how congestion shifts routing paths!
  if (AppState.selectedSource && AppState.selectedDest) {
    handleFindShortestPath();
  }
}

// ==========================================================================
// 10. FUNCTIONAL REQUIREMENT 6: Failure Simulation
// ==========================================================================

/**
 * Randomly disables an active network connection,
 * updates link appearance (dashed red), and recalculates route automatically.
 */
function simulateLinkFailure() {
  const activeEdges = AppState.edges.get().filter(e => !e.failed);

  if (activeEdges.length === 0) {
    showToast('All links are already failed or no links exist', 'warning');
    return;
  }

  // Prioritize breaking an edge on the active shortest path if one exists
  let targetEdge = null;
  if (AppState.currentShortestPath.length >= 2) {
    const path = AppState.currentShortestPath;
    const pathEdges = [];
    for (let i = 0; i < path.length - 1; i++) {
      const u = path[i];
      const v = path[i + 1];
      const match = activeEdges.find(e => (e.from === u && e.to === v) || (e.from === v && e.to === u));
      if (match) pathEdges.push(match);
    }
    if (pathEdges.length > 0) {
      targetEdge = pathEdges[Math.floor(Math.random() * pathEdges.length)];
    }
  }

  // Fallback to any random active edge
  if (!targetEdge) {
    targetEdge = activeEdges[Math.floor(Math.random() * activeEdges.length)];
  }

  // Disable link
  AppState.edges.update({
    id: targetEdge.id,
    failed: true,
    cost: Infinity,
    label: `FAILED ✕ [${targetEdge.baseCost}]`,
    color: { color: '#f43f5e', highlight: '#f43f5e' },
    font: { color: '#f43f5e', background: 'rgba(15, 23, 42, 0.95)' },
    dashes: [6, 6],
    width: 2.5
  });

  updateAllNodeTooltips();
  setNetworkStatus(`Link Severed: ${targetEdge.from} ↔ ${targetEdge.to}`, 'failure');
  showToast(`Simulated link failure: ${targetEdge.from} ↔ ${targetEdge.to} is DOWN! Recalculating...`, 'danger');

  // Automatic Fast Reconvergence
  if (AppState.selectedSource && AppState.selectedDest) {
    setTimeout(() => {
      handleFindShortestPath();
    }, 350);
  }
}

/**
 * Restores all failed links back to operational state
 */
function restoreFailedLinks() {
  const theme = getActiveThemeColors();
  const failedEdges = AppState.edges.get().filter(e => e.failed);

  if (failedEdges.length === 0) {
    showToast('No failed links to restore', 'info');
    return;
  }

  const restoredEdges = failedEdges.map(edge => ({
    id: edge.id,
    failed: false,
    cost: edge.baseCost,
    label: `Cost: ${edge.baseCost}`,
    color: {
      color: theme.edgeDefault,
      highlight: theme.nodeBorder
    },
    font: {
      color: theme.edgeLabelColor,
      background: theme.edgeLabelBg
    },
    dashes: false,
    width: 2.5
  }));

  AppState.edges.update(restoredEdges);
  updateAllNodeTooltips();
  setNetworkStatus('All Links Restored / Optimal', 'normal');
  showToast(`Restored ${failedEdges.length} severed links back online!`, 'success');

  if (AppState.selectedSource && AppState.selectedDest) {
    handleFindShortestPath();
  }
}

// ==========================================================================
// 11. FUNCTIONAL REQUIREMENT 8: Export Audit Report
// ==========================================================================

/**
 * Generates and downloads a clean text report (.txt)
 */
function exportNetworkReport() {
  const source = DOM.selectSource.value || 'N/A';
  const dest = DOM.selectDest.value || 'N/A';
  const pathStr = AppState.currentShortestPath.length > 0 ? AppState.currentShortestPath.join(' -> ') : 'Not calculated';
  const totalCost = DOM.resultCost.textContent;
  const hops = DOM.resultHops.textContent;
  const latency = DOM.resultDelay.textContent;
  const execTime = DOM.resultExecTime.textContent;

  const totalRouters = AppState.nodes.length;
  const totalLinks = AppState.edges.length;
  const density = DOM.statDensity.textContent;

  // Build routing table dump for current table source filter
  const tableSource = DOM.tableSourceFilter.value || source;
  const tableRows = AppState.currentReportData || [];

  let routingTableDump = `Source Router: ${tableSource}\n`;
  routingTableDump += `${'Destination'.padEnd(16)}${'Next Hop'.padEnd(16)}${'Total Cost'.padEnd(14)}${'Status'}\n`;
  routingTableDump += `${'-'.repeat(58)}\n`;

  tableRows.forEach(row => {
    routingTableDump += `${row.dest.padEnd(16)}${row.nextHop.padEnd(16)}${row.cost.toString().padEnd(14)}${row.status}\n`;
  });

  const reportText = `================================================================================
SMART NETWORK ROUTING SIMULATOR - DIJKSTRA AUDIT REPORT
Generated: ${new Date().toLocaleString()}
Protocol: Open Shortest Path First (OSPF) Metric Simulation
================================================================================

1. ACTIVE ROUTE QUERY
--------------------------------------------------------------------------------
Source Router:        ${source}
Destination Router:   ${dest}
Shortest Path:        ${pathStr}
Total Metric Cost:    ${totalCost}
Hop Count:            ${hops}
Estimated Latency:    ${latency}
SPF Execution Time:   ${execTime}

2. NETWORK TOPOLOGY METRICS
--------------------------------------------------------------------------------
Total Routers:        ${totalRouters}
Total Links:          ${totalLinks}
Network Density:      ${density}
Active Failures:      ${AppState.edges.get().filter(e => e.failed).length} link(s) down

3. ROUTING TABLE DUMP
--------------------------------------------------------------------------------
${routingTableDump}

4. TIME & SPACE COMPLEXITY ANALYSIS
--------------------------------------------------------------------------------
- Time Complexity:   O((V + E) log V) via Min-Heap Priority Queue
- Space Complexity:  O(V + E) Adjacency Representation
- Algorithm:         Dijkstra Single-Source Shortest Path (Greedy SPF)
- Reference RFC:     RFC 2328 (OSPF Version 2)

================================================================================
END OF REPORT
================================================================================`;

  const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
  const downloadUrl = URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');
  downloadLink.href = downloadUrl;
  downloadLink.download = `Network_Routing_Report_${Date.now()}.txt`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(downloadUrl);

  showToast('Network Audit Report exported successfully', 'success');
}

// ==========================================================================
// 12. Dynamic Routing Table
// ==========================================================================

/**
 * Calculates and populates full routing table from selected source
 */
function calculateAndDisplayRoutingTable(sourceRouterId) {
  const tbody = DOM.routingTableBody;
  tbody.innerHTML = '';

  if (!sourceRouterId || !AppState.nodes.get(sourceRouterId)) {
    tbody.innerHTML = '<tr><td colspan="5" class="table-empty-message">Select a valid source router.</td></tr>';
    return;
  }

  const result = runDijkstra(sourceRouterId, null);
  const allNodes = AppState.nodes.get();
  const reportRows = [];

  allNodes.forEach(node => {
    if (node.id === sourceRouterId) return; // Skip self

    const cost = result.distances[node.id];
    let nextHop = '--';
    let statusBadge = '<span class="status-badge optimal">Optimal</span>';
    let statusText = 'Optimal';

    if (cost === Infinity) {
      statusBadge = '<span class="status-badge unreachable">Unreachable</span>';
      statusText = 'Unreachable';
    } else {
      // Reconstruct path to find first hop after source
      let curr = node.id;
      let pathFromSource = [];
      while (curr !== null) {
        pathFromSource.unshift(curr);
        curr = result.previous[curr];
      }
      if (pathFromSource.length >= 2) {
        nextHop = `Router ${pathFromSource[1]}`;
      }
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>Router ${sourceRouterId}</strong></td>
      <td>Router ${node.id}</td>
      <td class="font-mono">${nextHop}</td>
      <td class="font-mono font-bold">${cost === Infinity ? '∞' : cost}</td>
      <td>${statusBadge}</td>
    `;
    tbody.appendChild(tr);

    reportRows.push({
      dest: `Router ${node.id}`,
      nextHop: nextHop,
      cost: cost === Infinity ? 'INF' : cost,
      status: statusText
    });
  });

  AppState.currentReportData = reportRows;
}

function clearRoutingTable() {
  DOM.routingTableBody.innerHTML = '<tr><td colspan="5" class="table-empty-message">No routers in network.</td></tr>';
}

// ==========================================================================
// 13. UI Helpers: Dropdowns, Stats, Results Strip, Search, Toasts
// ==========================================================================

/**
 * Updates Source, Destination, and Table Filter dropdowns
 */
function updateRouterDropdowns() {
  const nodes = AppState.nodes.get();
  const currentSource = DOM.selectSource.value;
  const currentDest = DOM.selectDest.value;
  const currentFilter = DOM.tableSourceFilter.value;

  const selects = [DOM.selectSource, DOM.selectDest, DOM.tableSourceFilter, DOM.connectNode1, DOM.connectNode2];
  
  selects.forEach(sel => {
    if (!sel) return;
    sel.innerHTML = '';
    nodes.forEach(n => {
      const opt = document.createElement('option');
      opt.value = n.id;
      opt.textContent = `Router ${n.id} (${n.ip || '192.168.1.x'})`;
      sel.appendChild(opt);
    });
  });

  // Restore previous values if still valid
  if (nodes.some(n => n.id === currentSource)) DOM.selectSource.value = currentSource;
  if (nodes.some(n => n.id === currentDest)) DOM.selectDest.value = currentDest;
  if (nodes.some(n => n.id === currentFilter)) DOM.tableSourceFilter.value = currentFilter;

  // For connect modal, pick 2 distinct nodes by default
  if (nodes.length >= 2) {
    DOM.connectNode1.value = nodes[0].id;
    DOM.connectNode2.value = nodes[1].id;
  }
}

/**
 * Updates network statistics cards with animated counters
 */
function updateNetworkStats() {
  const v = AppState.nodes.length;
  const e = AppState.edges.length;

  animateCounter(DOM.statRouters, v);
  animateCounter(DOM.statLinks, e);

  // Average Link Cost
  const allEdges = AppState.edges.get();
  if (e > 0) {
    const totalCost = allEdges.reduce((sum, ed) => sum + (ed.baseCost || 1), 0);
    const avg = (totalCost / e).toFixed(1);
    DOM.statAvgCost.textContent = avg;
  } else {
    DOM.statAvgCost.textContent = '0';
  }

  // Network Density: 2 * E / (V * (V - 1))
  if (v > 1) {
    const maxEdges = (v * (v - 1)) / 2;
    const densityPercent = ((e / maxEdges) * 100).toFixed(0);
    DOM.statDensity.textContent = `${Math.min(100, densityPercent)}%`;
  } else {
    DOM.statDensity.textContent = '0%';
  }
}

/**
 * Smooth number increment animation
 */
function animateCounter(element, targetValue) {
  const startValue = parseInt(element.textContent, 10) || 0;
  if (startValue === targetValue) return;

  const duration = 400;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const current = Math.round(startValue + (targetValue - startValue) * progress);
    element.textContent = current;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

/**
 * Updates results panel display with breadcrumb path badges
 */
function updateResultsDisplay(path, cost, hops, delay, execTime) {
  DOM.resultCost.textContent = cost;
  DOM.resultHops.textContent = hops;
  DOM.resultDelay.textContent = `${delay} ms`;
  DOM.resultExecTime.textContent = `${execTime} ms`;

  DOM.resultPath.innerHTML = '';
  path.forEach((nodeId, idx) => {
    const badge = document.createElement('span');
    badge.className = 'path-node-badge';
    if (idx === 0) badge.classList.add('source-badge');
    if (idx === path.length - 1) badge.classList.add('dest-badge');
    badge.textContent = `Router ${nodeId}`;
    DOM.resultPath.appendChild(badge);

    if (idx < path.length - 1) {
      const arrow = document.createElement('i');
      arrow.className = 'fa-solid fa-arrow-right-long path-arrow';
      DOM.resultPath.appendChild(arrow);
    }
  });
}

function resetResultsPanel(isUnreachable = false) {
  DOM.resultCost.textContent = '--';
  DOM.resultHops.textContent = '--';
  DOM.resultDelay.textContent = '--';
  DOM.resultExecTime.textContent = '--';

  if (isUnreachable) {
    DOM.resultPath.innerHTML = '<span style="color: #f43f5e; font-weight: 600;">No path found. Network partitions or link failures severed connection.</span>';
  } else {
    DOM.resultPath.innerHTML = '<span class="empty-path">Select source and destination, then click Find Shortest Path</span>';
  }
}

/**
 * Updates Header Network Status badge & pulsing dot
 */
function setNetworkStatus(text, type = 'normal') {
  DOM.networkStatusText.textContent = text;
  DOM.networkStatusBadge.className = 'status-indicator';

  if (type === 'calculating') DOM.networkStatusBadge.classList.add('calculating');
  if (type === 'traffic') DOM.networkStatusBadge.classList.add('traffic');
  if (type === 'failure') DOM.networkStatusBadge.classList.add('failure');
}

/**
 * Handles graph node click (quick select for source/dest)
 */
function handleNodeClick(nodeId) {
  if (!DOM.selectSource.value || DOM.selectSource.value === nodeId) {
    DOM.selectSource.value = nodeId;
    DOM.tableSourceFilter.value = nodeId;
    calculateAndDisplayRoutingTable(nodeId);
    showToast(`Source router set to Router ${nodeId}`, 'info');
  } else {
    DOM.selectDest.value = nodeId;
    showToast(`Destination set to Router ${nodeId}. Finding path...`, 'info');
    handleFindShortestPath();
  }
}

/**
 * FUNCTIONAL REQUIREMENT 9: Search Router
 * Highlights and focuses camera on searched router
 */
function handleRouterSearch(query) {
  const cleanQuery = query.trim().toUpperCase();
  if (!cleanQuery) {
    DOM.routerSearchClear.classList.add('hidden');
    return;
  }

  DOM.routerSearchClear.classList.remove('hidden');

  // Search by exact ID or substring
  const allNodes = AppState.nodes.get();
  const matched = allNodes.find(n => n.id === cleanQuery || n.id.includes(cleanQuery));

  if (matched) {
    AppState.network.focus(matched.id, {
      scale: 1.25,
      animation: {
        duration: 500,
        easingFunction: 'easeInOutQuad'
      }
    });
    AppState.network.selectNodes([matched.id]);
    setNetworkStatus(`Router Located: ${matched.id}`, 'normal');
  }
}

/**
 * Toast Notification system
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: 'fa-circle-check',
    info: 'fa-circle-info',
    warning: 'fa-triangle-exclamation',
    danger: 'fa-circle-xmark'
  };

  toast.innerHTML = `
    <i class="fa-solid ${iconMap[type] || 'fa-circle-info'} toast-icon"></i>
    <span>${message}</span>
  `;

  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3800);
}

// ==========================================================================
// 14. Event Listeners & Modals
// ==========================================================================
function initEventListeners() {
  // Theme Toggle
  DOM.themeToggleBtn.addEventListener('click', toggleTheme);

  // Controls
  DOM.btnSampleNetwork.addEventListener('click', loadSampleNetwork);
  DOM.btnRandomNetwork.addEventListener('click', generateRandomNetwork);
  DOM.btnResetNetwork.addEventListener('click', resetNetwork);
  DOM.btnSimulateTraffic.addEventListener('click', simulateNetworkTraffic);
  DOM.btnSimulateFailure.addEventListener('click', simulateLinkFailure);
  DOM.btnRestoreLinks.addEventListener('click', restoreFailedLinks);
  DOM.btnExportReport.addEventListener('click', exportNetworkReport);

  // Route Finder
  DOM.btnFindPath.addEventListener('click', handleFindShortestPath);
  DOM.btnAnimatePacket.addEventListener('click', startPacketAnimation);

  // Canvas Floating Zoom Controls
  DOM.btnZoomIn.addEventListener('click', () => {
    const scale = AppState.network.getScale();
    AppState.network.moveTo({ scale: scale * 1.3, animation: true });
  });

  DOM.btnZoomOut.addEventListener('click', () => {
    const scale = AppState.network.getScale();
    AppState.network.moveTo({ scale: scale * 0.75, animation: true });
  });

  DOM.btnCenterGraph.addEventListener('click', () => {
    AppState.network.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
  });

  DOM.btnFitCanvas.addEventListener('click', () => {
    AppState.network.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
  });

  // Physics Toggle
  DOM.btnTogglePhysics.addEventListener('click', () => {
    AppState.physicsEnabled = !AppState.physicsEnabled;
    AppState.network.setOptions({ physics: { enabled: AppState.physicsEnabled } });
    DOM.physicsStatus.textContent = AppState.physicsEnabled ? 'ON' : 'OFF';
    showToast(`Graph physics turned ${AppState.physicsEnabled ? 'ON' : 'OFF'}`, 'info');
  });

  // Routing Table Filter
  DOM.tableSourceFilter.addEventListener('change', (e) => {
    calculateAndDisplayRoutingTable(e.target.value);
  });

  // Search Router Input
  DOM.routerSearchInput.addEventListener('input', (e) => {
    handleRouterSearch(e.target.value);
  });

  DOM.routerSearchClear.addEventListener('click', () => {
    DOM.routerSearchInput.value = '';
    DOM.routerSearchClear.classList.add('hidden');
    AppState.network.unselectAll();
  });

  // Educational Accordion Toggle
  DOM.accordionToggleBtn.addEventListener('click', () => {
    const isOpen = DOM.accordionContent.classList.contains('open');
    if (isOpen) {
      DOM.accordionContent.classList.remove('open');
      DOM.accordionChevron.classList.remove('open');
    } else {
      DOM.accordionContent.classList.add('open');
      DOM.accordionChevron.classList.add('open');
    }
  });

  // Modal: Add Router
  DOM.btnAddRouter.addEventListener('click', () => {
    DOM.inputRouterId.value = '';
    DOM.inputRouterIp.value = '';
    DOM.modalAddRouter.classList.remove('hidden');
    DOM.inputRouterId.focus();
  });

  const closeAddModal = () => DOM.modalAddRouter.classList.add('hidden');
  DOM.modalAddRouterClose.addEventListener('click', closeAddModal);
  DOM.modalAddRouterCancel.addEventListener('click', closeAddModal);

  DOM.formAddRouter.addEventListener('submit', (e) => {
    e.preventDefault();
    const success = handleAddRouter(DOM.inputRouterId.value, DOM.inputRouterIp.value);
    if (success) closeAddModal();
  });

  // Modal: Connect Routers
  DOM.btnConnectRouters.addEventListener('click', () => {
    if (AppState.nodes.length < 2) {
      showToast('Need at least 2 routers to create a connection', 'warning');
      return;
    }
    updateRouterDropdowns();
    DOM.modalConnect.classList.remove('hidden');
  });

  const closeConnectModal = () => DOM.modalConnect.classList.add('hidden');
  DOM.modalConnectClose.addEventListener('click', closeConnectModal);
  DOM.modalConnectCancel.addEventListener('click', closeConnectModal);

  DOM.formConnect.addEventListener('submit', (e) => {
    e.preventDefault();
    const success = handleConnectRouters(
      DOM.connectNode1.value,
      DOM.connectNode2.value,
      DOM.inputLinkCost.value
    );
    if (success) closeConnectModal();
  });

  // Landing Page Transition
  const landingPage = document.getElementById('landing-page');
  const enterSimulatorBtn = document.getElementById('enter-simulator-btn');

  if (enterSimulatorBtn && landingPage) {
    enterSimulatorBtn.addEventListener('click', () => {
      landingPage.classList.add('fade-out');

      // Hide landing page after fade-out animation completes
      setTimeout(() => {
        landingPage.style.display = 'none';
        landingPage.classList.remove('fade-out');
        landingPage.style.opacity = '1';
      }, 800);
    });
  }

// Close modals on Escape key or backdrop click
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAddModal();
      closeConnectModal();
    }
  });

  [DOM.modalAddRouter, DOM.modalConnect].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });
  });
}

