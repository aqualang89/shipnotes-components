/* Sample downloads stay in this browser; no network requests. */
(() => {
  const sampleFiles=[
    {title:'The brief',type:'TXT',meta:'PROJECT NOTES',description:'A clear starting point. The idea, the audience and the things worth getting right.',mime:'text/plain',content:'PROJECT BRIEF\n\nMake room for good ideas.\n\nAudience: independent designers and developers.\nGoal: a small, welcoming home for a creative project.\nKeep: clear type, a little color and thoughtful motion.\nAvoid: clutter and unnecessary dependencies.\n\nSample file by Ship Notes. MIT.\n'},
    {title:'Color story',type:'JSON',meta:'DESIGN TOKENS',description:'Five colors, one direction. A small set of design tokens ready for your next project.',mime:'application/json',content:JSON.stringify({ink:'#493660',violet:'#785eaa',lilac:'#a389cc',blush:'#e2cce9',paper:'#f4e9dc'},null,2)},
    {title:'Orbit mark',type:'SVG',meta:'VECTOR ARTWORK',description:'A little symbol for big ideas. Original vector artwork, ready to resize and make your own.',mime:'image/svg+xml',content:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 180"><title>Orbit mark by Ship Notes, MIT</title><g fill="none" stroke="#23463e" stroke-width="10"><ellipse cx="100" cy="90" rx="71" ry="30" transform="rotate(-40 100 90)"/><ellipse cx="100" cy="90" rx="71" ry="30" transform="rotate(40 100 90)"/></g><circle cx="100" cy="90" r="13" fill="#23463e"/></svg>'}
  ];
  const urls=sampleFiles.map(f=>URL.createObjectURL(new Blob([f.content],{type:f.mime})));
  document.querySelectorAll('pocket-files').forEach(el=>el.files=sampleFiles.map((f,i)=>({...f,href:urls[i]})));
  // Blob URLs live for this document and are released by the browser on unload.
})();
