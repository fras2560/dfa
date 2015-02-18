/*
global variables
*/
var width,
    height,
    colors,
    padding,
    svg,
    nodes,
    links,
    lastNodeId,
    startingState,
    alphabet,
    force,
    drag_line,
    path,
    selected_node = null,
    selected_link = null,
    selected_label = null,
    mousedown_link = null,
    mousedown_node = null,
    mouseup_node = null,
    lastKeyDown = -1
    transitionFunction = {},
    finishStates = [];

function resetMouseVars() {
  /*
    a function that resets the Mouse variables
    Parameters:
      None
    Returns:
      None
  */
  mousedown_node = null;
  mouseup_node = null;
  mousedown_link = null;
}

function linkArc(d){
  /*
  a function that  calculates the arc of the link
  Parameters:
    d: the data object of the link(Object)
  Returns:
    : a string representing the arc in SVG format (elliptical arc)
      format -> M x,y  A rx,ry x-axis-rotation large-arc-flag, sweepflag  x,y
  */
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
  return "M" + sourceX + "," + sourceY + "A" + Math.floor(dist / 2) + "," + Math.floor(dist / 2) + " 0 0," + sweepFlag + targetX + "," + targetY;

}

function tick() {
  /*
  a function that updates the force layour
  Parameters:
    None
  Returns:
    None
  */

  // draw directed edges with proper padding from node centers
  path.attr('d', linkArc);

  circle.attr('transform', function(d) {
    return 'translate(' + d.x + ',' + d.y + ')';
  });
}

function pathRestart(){
  /*
  a function that resets deals with entering, updating and exiting path elements
  Parameters:
    None
  Returns:
    None
  */
  path = path.data(links);

  // update existing links
  path.classed('selected', function(d) { return d === selected_link; })
    .style('marker-end', function(d) { return 'url(#end-arrow)'})
    .attr('id', function(d, i) { return 'link_' + i;})
  ;
  // add new links
  var l = path.enter().append('svg:path')
    .attr('class', 'link')
    .attr('id', function(d, i) { return 'link_' + i})
    .classed('selected', function(d) { return d === selected_link; })
    .style('marker-end', function(d) { return 'url(#end-arrow)'})
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
  /*
  a function that resets deals with entering, updating and exiting label elements
  Parameters:
    None
  Returns:
    None
  */
  labels = labels.data(links)
  // update existins labels
  for (var i = 0; i < links.length; i++){
    d3.select("#label_" + i).text(function(d) {return d.alphabet.join()})
  }
  // add new labels
  var l = labels.enter().append('svg:text')
      .attr('x', 6)
      .attr('dy', 15)
      .attr('class', 'label');
  l.append('textPath')
      .attr('class', '.textpath')
      .attr('xlink:href', function(d, i) { return '#link_' + i })
      .attr('id', function(d, i) {return 'label_' + i})
      .style('stroke', function(d) { return d3.rgb(255,0,0).toString();})
      .style('fill', function(d) { return d3.rgb(0,255,0).toString();})
      .text(function(d) {return d.alphabet.join()})
  //remove old labels
  labels.exit().remove();
}

function circleRestart(){
  /*
  a function that resets deals with entering, updating, exiting and mouse 
  events dealing with circle elements
  Parameters:
    None
  Returns:
    None
  */
  // circle (node) group
  // NB: the function arg is crucial here! nodes are known by id, not by index!
  circle = circle.data(nodes, function(d) { return d.id; });
  // update existing nodes (reflexive & selected visual states)
  circle.selectAll('circle')
    .style('fill', function(d) { return (d === selected_node) ? d3.rgb(colors(d.id)).brighter().toString() : colors(d.id); })
    .classed('reflexive', function(d) { return d.reflexive; })
    .classed('accepting', function(d) {return d.accepting});
  // add new nodes
  var g = circle.enter().append('svg:g');
  g.append('svg:circle')
    .attr('class', 'node')
    .attr('r', 12)
    .style('fill', function(d) { return (d === selected_node) ? d3.rgb(colors(d.id)).brighter().toString() : colors(d.id); })
    .style('stroke', function(d) { return d3.rgb(colors(d.id)).darker().toString(); })
    .classed('reflexive', function(d) { return d.reflexive; })
    .classed('accepting', function(d) {return d.accepting})
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
      source = mousedown_node;
      target = mouseup_node;
      if(mousedown_node.id < mouseup_node.id) {
        direction = 'right';
      } else {  
        direction = 'left';
      }
      // find if one link already exists
      var link;
      link = links.filter(function(l) {
        return (l.source === source && l.target === target);
      });
      if (link.length == 0) {
        // no link before
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

function restart() {
  /*
  a function that updates the graph
  Parameters:
    None
  Returns:
    None
  */
  // update the three sets of components
  console.log(transitionFunction);
  pathRestart();
  labelRestart();
  circleRestart();
  refreshTable();
  // set the graph in motion
  force.start();
}

function mousedown() {
  /*
  a function that deals with mouseDown events
  Parameters:
    None
  Returns:
    None
  */
  svg.classed('active', true);
  if(d3.event.ctrlKey || mousedown_node || mousedown_link) return;

  // insert new node at point
  var point = d3.mouse(this),
      node = {id: ++lastNodeId, reflexive: false, accepting: false};
  node.x = point[0];
  node.y = point[1];
  nodes.push(node);
  addTransition(node.id, alphabet);

  restart();
}

function mousemove() {
  /*
  a function that deals with mouse move events
  Parameters:
    None
  Returns:
    None
  */
  if(!mousedown_node) return;

  // update drag line
  drag_line.attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + d3.mouse(this)[0] + ',' + d3.mouse(this)[1]);

  restart();
}

function mouseup() {
  /*
  a function that deals with mouseup events
  */
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
  /*
  a function that splice the links for node
  Parameters:
    None
  Returns:
    None
  */
  var toSplice = links.filter(function(l) {
    return (l.source === node || l.target === node);
  });
  toSplice.map(function(l) {
    links.splice(links.indexOf(l), 1);
  });
}

function linkKeyEvent(keyCode){
  /*
  a function that deals with a link key event
  Parameters:
    keyCode: the key code for the pressed event
  Returns:
    None
  */
  switch(keyCode){
    case 8: //backspace
    case 46: //delete
      if (selected_link.alphabet.length > 0){
        var letter = selected_link.alphabet.pop();
        deleteTransition([selected_link.source.id, letter]);
      }else{
        links.splice(links.indexOf(selected_link), 1);
        selected_link = null;
        selected_node = null;
      }
      break;
    case 48: // 0
        if (checkTransition(selected_link.source.id, 0)){
          selected_link.alphabet.push(0);
          addTransition([selected_link.source.id, 0], selected_link.target.id)
          selected_link.alphabet.sort(function(a, b){return a-b});
        }
      break;
    case 49: // 1
        if (checkTransition(selected_link.source.id, 1)){
            selected_link.alphabet.push(1);
            addTransition([selected_link.source.id, 1], selected_link.target.id)
            selected_link.alphabet.sort(function(a, b){return a-b});
        }
      break;
  }
  restart();
}

function nodeKeyEvent(keyCode){
  /*
  a function that deals with the node key evenet
  Parameters:
    keyCode: the key code for the pressed event
  Returns:
    None
  */
  console.log(keyCode);
  switch(keyCode){
    case 8: //backspace
    case 46: //delete
      deleteState(selected_node.id)
      nodes.splice(nodes.indexOf(selected_node), 1);
      spliceLinksForNode(selected_node);
      selected_link = null;
      selected_node = null;
      restart();
      break;
    case 70: // f
      if (! contains(finishStates, selected_node.id)){
        finishStates.push(selected_node.id);
        selected_node.accepting = true;
        restart()
      }
      break;
    case 83: // s
      startingState = selected_node;
      restart();
      break;
  }
}

function keydown() {
  /*
  a function that deals with a keydown event
  Parameters:
    None
  Returns:
    None
  */
  d3.event.preventDefault();
  if(lastKeyDown !== -1) return;
  lastKeyDown = d3.event.keyCode;
  // ctrl
  if(d3.event.keyCode === 17) {
    circle.call(force.drag);
    svg.classed('ctrl', true);
  }
  if (selected_node){
    nodeKeyEvent(lastKeyDown);
  }else if(selected_link){
    linkKeyEvent(lastKeyDown);
  }else{

  }
}

function contains(array, element){
  /*
  a function that checks if the element is contain in array
  Parameters:
    array: the array to check
    element: the element to check if in array
  Returns:
    found: true if does contain false otherwise (boolean) 
  */
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
  /*
  a function the deals with keyup events
  Parameters:
    None
  Returns:
    None
  */
  lastKeyDown = -1;

  // ctrl
  if(d3.event.keyCode === 17) {
    circle
      .on('mousedown.drag', null)
      .on('touchstart.drag', null);
    svg.classed('ctrl', false);
  }
}

function refreshTable(){
  /*
  a function that updates the transition function
  Parameters:
    None
  Returns:
    None 
  */
  $('#dfa_table tbody').empty();
  var entry = '';
  var id;
  var map = {};
  var node,link,letter;
  for(node = 0; node < nodes.length; node++){
    id = nodes[node].id;
    entry = '<tr><td id=state_'+ id +'>' + id; + '</td>';
    map = {0:'<td></td>', 1:'<td></td>'}
    //now find state transitions
    for (link = 0; link < links.length; link ++){
      if (links[link].source.id == id){
        for(letter = 0; letter< links[link].alphabet.length; letter++ ){
          map[links[link].alphabet[letter]] = '<td>' + links[link].target.id + '</td>';
        }
      }
    }
    entry += map[0] + map[1] + '</tr>';
    $('#dfa_table tbody').append(entry);
  }
  if (startingState){
    $('#state_' + startingState.id).addClass('starting');
  }
}

function initializeTransitions(states, alphabet){
  /*
    a function that initializes the transition function
    Parmaeters:
      states: array of the current states
      alphabet: the alphabet of dfa
    Returns:
      None
  */
  var state, letter;
  for (state = 0; state< states.length; state++){
    for(letter = 0; letter < alphabet.length; letter++){
      transitionFunction[[states[state], alphabet[letter]]] = null;
    }
  }
}

function addTransition(key, transition){
  /*
    a function that add a transtion to the transition function
    Parameters:
      key: a key pair [state id, letter]
      transition: the state to transition to
    Returns:
      None
  */
  transitionFunction[key] = transition;
}
function deleteTransition(key){
  /*
    a function that deletes a transition
    Parameters:
      key: a key pair [state id, letter]
    Returns:
      None
  */
  transitionFunction[key] = null;
}

function addState(index, alphabet){
  /*
    a function that adds a state to the transition function
    Parameters:
      index: the index of the node to add
      alphabet: the dfa language
    Returns:
      None
  */
  for(var letter = 0; letter < alphabet.length; letter++){
    transitionFunction[[index, letter]] = null;
  }
}

function deleteState(index, alphabet){
  /*
    a function that delete a state from the transition function
    Parameters:
      index: the index of the node to delete
      alphabet: the alphabet of the dfa
    Returns:
      None
  */
  for (var letter = 0; letter < alphabet.length; letter++){
    delete transitionFunction[[index, letter]];
  }
}

function checkTransition(state, letter){
  /*
    a function that check if the state does not already have a transition
    Parameters:
      key: a key pair [state id, letter]
    Returns:
      allowed: true if  can add transition (boolean)
  */
  var allowed = false;
  console.log(transitionFunction[[state, letter]]);
  if (transitionFunction[[state, letter]] === null){  
    allowed = true;
  }else{
    alert("The state already has a transition for that letter");
  }
  return allowed;
}

function animate(){
  var string = $('#inputString').val();
  if (startingState){
    if(finishStates.length > 0){
      console.log(startingState)
      animate_aux(string, 0, startingState.id);
    }else{
      alert("String will not be accepted since not accepting state");
    }
  }else{
    alert("No Starting State");
  }
}

function animate_aux(string, position, state){
  var letter, next_state
  console.log("String:", string);
  console.log("Position:", position);
  console.log("State:", state);
  
  if (position < string.length){
    letter = string[position];
    position += 1;
    next_state = transitionFunction[[state, letter]];
    if (next_state !== null){
      animate_aux(string, position, next_state)
    }else{
      alert("No transition state so assume error state: String not accepted");
    }
  }else{
    console.log(state);
    if(contains(finishStates, state)){
      alert("String is accepted by DFA")
    }else{
      alert("String was not accepted by DFA")
    }
  }
}

function init(id, w, h){
  /*
  a function that initializes the app
  Parameters:
    id: the id of the element to append the app to
    width: the specified width of the app
    height: the specified height of the app
  Returns:
    None
  */
  width  = w,
  height = h,
  colors = d3.scale.category10()
  padding = 5;
  svg = d3.select('#' + id)
    .append('svg')
    .attr('width', width)
    .attr('height', height);
  nodes = [
    {id: 0, reflexive: false, accepting: false},
    {id: 1, reflexive: false, accepting: false},
    {id: 2, reflexive: false, accepting: false}
  ],
  lastNodeId = 2,
  links = [
    {source: nodes[0], target: nodes[1], left: false, right: true, alphabet: [0], bend: 1},
    {source: nodes[1], target: nodes[2], left: false, right: true, alphabet: [1], bend: 1}
  ];
  initializeTransitions([0, 1, 2], [0, 1]);
  console.log(transitionFunction);
  addTransition([0,0], 1);
  addTransition([1,1], 2);
  console.log(transitionFunction);
  alphabet = [0,1];
  // init D3 force layout
  force = d3.layout.force()
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
  drag_line = svg.append('svg:path')
    .attr('class', 'link dragline hidden')
    .attr('d', 'M0,0L0,0');
  // handles to link and node element groups
  path = svg.append('svg:g').selectAll('path'),
  circle = svg.append('svg:g').selectAll('g'),
  labels = svg.append('svg:g').selectAll('text');
  // mouse event vars
  selected_node = null,
  selected_link = null,
  selected_label = null,
  mousedown_link = null,
  mousedown_node = null,
  mouseup_node = null;
  // app starts here
  svg.on('mousedown', mousedown)
    .on('mousemove', mousemove)
    .on('mouseup', mouseup);
  d3.select(window)
    .on('keydown', keydown)
    .on('keyup', keyup);
  restart();
}