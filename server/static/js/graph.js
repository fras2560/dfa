// set up SVG for D3
var width  = 960,
    height = 500,
    colors = d3.scale.category10()
    padding = 5;

var svg = d3.select('#dfa')
  .append('svg')
  .attr('width', width)
  .attr('height', height);

// set up initial nodes and links
//  - nodes are known by 'id', not by index in array.
//  - reflexive edges are indicated on the node (as a bold black circle).
//  - links are always source < target; edge directions are set by 'left' and 'right'.
var nodes = [
    {id: 0, reflexive: false},
    {id: 1, reflexive: true },
    {id: 2, reflexive: false}
  ],
  lastNodeId = 2,
  links = [
    {source: nodes[0], target: nodes[1], left: false, right: true, alphabet: [0], bend: 1 },
    {source: nodes[1], target: nodes[2], left: false, right: true, alphabet: [1], bend: 1}
  ];

var alphabet = [0,1];


// init D3 force layout
var force = d3.layout.force()
    .nodes(nodes)
    .links(links)
    .size([width, height])
    .linkDistance(150)
    .charge(-500)
    .on('tick', tick)

// define arrow markers for graph links
svg.append('svg:defs').append('svg:marker')
    .attr('id', 'end-arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 6)
    .attr('markerWidth', 3)
    .attr('markerHeight', 3)
    .attr('orient', 'auto')
  .append('svg:path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', '#000');

svg.append('svg:defs').append('svg:marker')
    .attr('id', 'start-arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 4)
    .attr('markerWidth', 3)
    .attr('markerHeight', 3)
    .attr('orient', 'auto')
  .append('svg:path')
    .attr('d', 'M10,-5L0,0L10,5')
    .attr('fill', '#000');

// line displayed when dragging new nodes
var drag_line = svg.append('svg:path')
  .attr('class', 'link dragline hidden')
  .attr('d', 'M0,0L0,0');

// handles to link and node element groups
var path = svg.append('svg:g').selectAll('path'),
    circle = svg.append('svg:g').selectAll('g'),
    labels = svg.append('svg:g').selectAll('text');

// mouse event vars
var selected_node = null,
    selected_link = null,
    selected_label = null,
    mousedown_link = null,
    mousedown_node = null,
    mouseup_node = null;

function resetMouseVars() {
  mousedown_node = null;
  mouseup_node = null;
  mousedown_link = null;
}
function linkArc(d){
  var deltaX = d.target.x - d.source.x,
        deltaY = d.target.y - d.source.y,
        dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
        middleX = deltaX > deltaY ? Math.floor((d.source.x+d.target.x)/2) : d.source.x + d.bend * padding,
        middleY = deltaY > deltaX ? Math.floor((d.source.y+d.target.y)/2) : d.source.y + d.bend * padding
        normX = deltaX / dist,
        normY = deltaY / dist,
        sourcePadding = d.left ? 17 : 12,
        targetPadding = d.right ? 17 : 12,
        sourceX = d.source.x + (sourcePadding * normX),
        sourceY = d.source.y + (sourcePadding * normY),
        targetX = d.target.x - (targetPadding * normX),
        targetY = d.target.y - (targetPadding * normY);
  var sweepFlag = d.bend > 0 ? 1 : 0
  return "M" + sourceX + "," + sourceY + "A" + dist + "," + dist + " 0 0," + sweepFlag + targetX + "," + targetY;

}

// update force layout (called automatically each iteration)
function tick() {
  // draw directed edges with proper padding from node centers
  path.attr('d', linkArc);

  labels.attr('transform', function(d){
    var x = Math.floor((d.target.x + d.source.x) / 2);
    var y = Math.floor((d.target.y + d.source.y) / 2);
    return 'translate('+ x + ',' + y + ')';
  });

  circle.attr('transform', function(d) {
    return 'translate(' + d.x + ',' + d.y + ')';
  });
}

function pathRestart(){
  path = path.data(links);

  // update existing links
  path.classed('selected', function(d) { return d === selected_link; })
    .style('marker-start', function(d) { return d.left ? 'url(#start-arrow)' : ''; })
    .style('marker-end', function(d) { return d.right ? 'url(#end-arrow)' : ''; });
  // add new links
  var l = path.enter().append('svg:path')
    .attr('class', 'link')
    .classed('selected', function(d) { return d === selected_link; })
    .style('marker-start', function(d) { return d.left ? 'url(#start-arrow)' : ''; })
    .style('marker-end', function(d) { return d.right ? 'url(#end-arrow)' : ''; })
    .on('mousedown', function(d) {
      if(d3.event.ctrlKey) return;

      // select link
      mousedown_link = d;
      if(mousedown_link === selected_link) selected_link = null;
      else selected_link = mousedown_link;
      selected_node = null;
      restart();
    });
  // remove old links
  path.exit().remove();
}

function labelRestart(){
  labels = labels.data(links)
  
  // update old labels
  labels.classed('selected', function(d) {return d === selected_label; })
    .text(function(d) {return d.alphabet.join();})

  // add new labels
  var l = labels.enter().append('svg:text')
      .attr('x', 0)
      .attr('y', 0)
      .attr('class', 'label')
      .style('stroke', function(d) { return d3.rgb(255,0,0).toString();})
      .style('fill', function(d) { return d3.rgb(0,255,0).toString();})
      .text(function(d) {return d.alphabet.join()})
  //remove old labels
  labels.exit().remove();
}

function circleRestart(){
  // circle (node) group
  // NB: the function arg is crucial here! nodes are known by id, not by index!
  circle = circle.data(nodes, function(d) { return d.id; });

  // update existing nodes (reflexive & selected visual states)
  circle.selectAll('circle')
    .style('fill', function(d) { return (d === selected_node) ? d3.rgb(colors(d.id)).brighter().toString() : colors(d.id); })
    .classed('reflexive', function(d) { return d.reflexive; });

  // add new nodes
  var g = circle.enter().append('svg:g');

  g.append('svg:circle')
    .attr('class', 'node')
    .attr('r', 12)
    .style('fill', function(d) { return (d === selected_node) ? d3.rgb(colors(d.id)).brighter().toString() : colors(d.id); })
    .style('stroke', function(d) { return d3.rgb(colors(d.id)).darker().toString(); })
    .classed('reflexive', function(d) { return d.reflexive; })
    .on('mouseover', function(d) {
      if(!mousedown_node || d === mousedown_node) return;
      // enlarge target node
      d3.select(this).attr('transform', 'scale(1.1)');
    })
    .on('mouseout', function(d) {
      if(!mousedown_node || d === mousedown_node) return;
      // unenlarge target node
      d3.select(this).attr('transform', '');
    })
    .on('mousedown', function(d) {
      if(d3.event.ctrlKey) return;

      // select node
      mousedown_node = d;
      if(mousedown_node === selected_node) selected_node = null;
      else selected_node = mousedown_node;
      selected_link = null;

      // reposition drag line
      drag_line
        .style('marker-end', 'url(#end-arrow)')
        .classed('hidden', false)
        .attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + mousedown_node.x + ',' + mousedown_node.y);

      restart();
    })
    .on('mouseup', function(d) {
      if(!mousedown_node) return;

      // needed by FF
      drag_line
        .classed('hidden', true)
        .style('marker-end', '');

      // check for drag-to-self
      mouseup_node = d;
      if(mouseup_node === mousedown_node) { resetMouseVars(); return; }

      // unenlarge target node
      d3.select(this).attr('transform', '');

      // add link to graph (update if exists)
      // NB: links are strictly source < target; arrows separately specified by booleans
      var source, target, direction;
      if(mousedown_node.id < mouseup_node.id) {
        source = mousedown_node;
        target = mouseup_node;
        direction = 'right';
      } else {
        source = mouseup_node;
        target = mousedown_node;
        direction = 'left';
      }
      // find if one link already exists
      var link;
      link = links.filter(function(l) {
        return (l.source === source && l.target === target);
      });
      console.log(link);
      if(link.length == 1) {
        if (link[0][direction] == false){
          link = {source: source, target: target, left: false, right: false, alphabet:[], bend: -1};
          link[direction] = true;
          links.push(link);
        }
      } else if (link.length == 0) {
        link = {source: source, target: target, left: false, right: false, alphabet:[], bend: 1};
        link[direction] = true;
        links.push(link);
      }

      // select new link
      selected_link = link;
      selected_node = null;
      restart();
    });

  // show node IDs
  g.append('svg:text')
      .attr('x', 0)
      .attr('y', 4)
      .attr('class', 'id')
      .text(function(d) { return d.id; });
  // remove old nodes
  circle.exit().remove();
}

// update graph (called when needed)
function restart() {
  // update the three sets of components
  pathRestart();
  labelRestart();
  circleRestart();
  refreshTable();
  // set the graph in motion
  force.start();
}

function mousedown() {
  // prevent I-bar on drag
  //d3.event.preventDefault();
  
  // because :active only works in WebKit?
  svg.classed('active', true);

  if(d3.event.ctrlKey || mousedown_node || mousedown_link) return;

  // insert new node at point
  var point = d3.mouse(this),
      node = {id: ++lastNodeId, reflexive: false};
  node.x = point[0];
  node.y = point[1];
  nodes.push(node);

  restart();
}

function mousemove() {
  if(!mousedown_node) return;

  // update drag line
  drag_line.attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + d3.mouse(this)[0] + ',' + d3.mouse(this)[1]);

  restart();
}

function mouseup() {
  if(mousedown_node) {
    // hide drag line
    drag_line
      .classed('hidden', true)
      .style('marker-end', '');
  }

  // because :active only works in WebKit?
  svg.classed('active', false);

  // clear mouse event vars
  resetMouseVars();
}

function spliceLinksForNode(node) {
  var toSplice = links.filter(function(l) {
    return (l.source === node || l.target === node);
  });
  toSplice.map(function(l) {
    links.splice(links.indexOf(l), 1);
  });
}

// only respond once per keydown
var lastKeyDown = -1;

function keydown() {
  d3.event.preventDefault();

  if(lastKeyDown !== -1) return;
  lastKeyDown = d3.event.keyCode;

  // ctrl
  if(d3.event.keyCode === 17) {
    circle.call(force.drag);
    svg.classed('ctrl', true);
  }

  if(!selected_node && !selected_link) return;
  switch(d3.event.keyCode) {
    case 8: // backspace
    case 46: // delete
      if(selected_node) {
        nodes.splice(nodes.indexOf(selected_node), 1);
        spliceLinksForNode(selected_node);
      } else if(selected_link) {
        links.splice(links.indexOf(selected_link), 1);
      }
      selected_link = null;
      selected_node = null;
      restart();
      break;
    case 66: // B
      if(selected_link) {
        // set link direction to both left and right
        selected_link.left = true;
        selected_link.right = true;
      }
      restart();
      break;
    case 76: // L
      if(selected_link) {
        // set link direction to left only
        selected_link.left = true;
        selected_link.right = false;
      }
      restart();
      break;
    case 82: // R
      if(selected_node) {
        // toggle node reflexivity
        selected_node.reflexive = !selected_node.reflexive;
      } else if(selected_link) {
        // set link direction to right only
        selected_link.left = false;
        selected_link.right = true;
      }
      restart();
      break;
    case 48: // 0
      if (selected_link){
        if (!contains(selected_link.alphabet, 0)){
          selected_link.alphabet.push(0);
          selected_link.alphabet.sort(function(a, b){return a-b});
        }
        
      }
      restart();
      break;
    case 49: // 1
      if (!contains(selected_link.alphabet, 1)){
          selected_link.alphabet.push(1);
          selected_link.alphabet.sort(function(a, b){return a-b});
      }
      restart();
      break;
  }
}

function contains(array, element){
  var found = false;
  var i=0;
  while (!found && i < array.length){
    if (array[i] == element){
      found = true
    }
    i += 1;
  }
  return found
}

function keyup() {
  lastKeyDown = -1;

  // ctrl
  if(d3.event.keyCode === 17) {
    circle
      .on('mousedown.drag', null)
      .on('touchstart.drag', null);
    svg.classed('ctrl', false);
  }
}

// app starts here
svg.on('mousedown', mousedown)
  .on('mousemove', mousemove)
  .on('mouseup', mouseup);
d3.select(window)
  .on('keydown', keydown)
  .on('keyup', keyup);
restart();

function refreshTable(){
  $('#dfa_table tbody').empty();
  var entry = '';
  var id;
  var map = {};
  var node,link,letter;
  for(node = 0; node < nodes.length; node++){
    id = nodes[node].id;
    entry = '<tr><td>' + id; + '</td>';
    map = {0:'<td></td>', 1:'<td></td>'}
    //now find state transitions
    for (link = 0; link < links.length; link ++){
      if (links[link].source.id == id && links[link].right == true){
        for(letter = 0; letter< links[link].alphabet.length; letter++ ){
          map[links[link].alphabet[letter]] = '<td>' + links[link].target.id + '</td>';
        }
      }else if (links[link].target.id == id && links[link].left == true){
        for (letter = 0; letter < links[link].alphabet.length; letter++){
          map[links[link].alphabet[letter]] = '<td>' + links[link].source.id + '</td>';
        }

      }
    }
    entry += map[0] + map[1] + '</tr>';
    $('#dfa_table tbody').append(entry);
  }
}