const vertex=`#version 300 es
in vec2 position;out vec2 uv;
void main(){uv=(position+1.)*.5;gl_Position=vec4(position,0.,1.);}`;
const fragment=`#version 300 es
precision highp float;
in vec2 uv;out vec4 frag;
uniform sampler2D source;uniform sampler2D mask;
uniform vec2 nativeSize;uniform vec2 renderSize;uniform float phase;uniform int effect;
uniform float intensity;uniform float scale;uniform float speed;uniform float detail;
uniform vec3 tint;uniform float density;uniform float direction;uniform float variant;uniform float windStrength;uniform float rainLength;uniform float splash;uniform vec2 origin;uniform float pixelSize;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 q){vec2 i=floor(q),f=fract(q);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float cloud(vec2 q){return .57*noise(q)+.28*noise(q*2.03)+.15*noise(q*4.01);}
// Circular noise sampling has identical position and velocity across the seam.
float billow(vec2 q,float t,vec2 wind){vec2 side=vec2(-wind.y,wind.x);return cloud(q+wind*cos(t)*1.4+side*sin(t)*1.4);}
// Cross-fade two translating fields; each resets only at zero weight.
float windCloud(vec2 q,float t,vec2 travel){float a=fract(t/6.28318530718),b=fract(a+.5);float blend=.5-.5*cos(a*6.28318530718);return mix(cloud(q-travel*b+17.),cloud(q-travel*a),blend);}
float rainField(vec2 px,vec2 fall,float t,float depth){
 vec2 across=vec2(fall.y,-fall.x);float spacing=mix(44.,90.,depth)*scale;
 vec2 q=vec2(dot(px,across),dot(px,fall))/spacing;
 vec2 cell=floor(q);float sum=0.;
 for(int x=-1;x<=1;x++)for(int y=-2;y<=2;y++){
  vec2 offset=vec2(float(x),float(y)),id=cell+offset;float seed=hash(id+depth*91.);
  // Many short lifetimes produce a continuous downpour, at integral loop frequencies.
  float life=fract(t/6.28318530718*(12.+depth*12.)+seed);
  vec2 centre=vec2(.15+.7*hash(id+4.),life*3.-1.);
  vec2 d=q-cell-offset-centre;
  float width=mix(.009,.035,detail)*mix(.65,1.3,depth);
  float length=mix(.18,.85,rainLength)*mix(.65,1.2,depth);
  float aa=max(pixelSize/spacing,.003);
  float streak=(1.-smoothstep(width,width+aa,abs(d.x)))*(1.-smoothstep(length*.2,length,abs(d.y)));
  float fade=smoothstep(0.,.15,life)*(1.-smoothstep(.85,1.,life));
  sum+=streak*fade*step(seed,density)*mix(.4,.85,depth);
 }
 return sum;
}
void main(){
 // Exact texel copies avoid interpolation rounding when source and target match.
 vec3 c=all(equal(textureSize(source,0),ivec2(renderSize)))?texelFetch(source,ivec2(gl_FragCoord.xy),0).rgb:texture(source,uv).rgb;float m=texture(mask,uv).a;
 vec2 px=uv*nativeSize;float t=phase*speed;
 float angle=radians(direction);vec2 wind=vec2(sin(angle),cos(angle));bool shared=windStrength>=0.;float strength=max(0.,windStrength);
 vec2 travel=wind*(.4+strength*3.5);vec2 fall=shared?normalize(vec2(0.,-1.)+wind*strength*.85):wind;
 float s=max(.15,scale);vec2 p=px/(110.*s);
 if(effect==0){frag=vec4(c,1.);return;}
 if(m<.002){frag=vec4(c,1.);return;}
 if(effect==1){
  vec2 w=p+vec2(.36*sin(p.y*1.3+t)+.18*cos(p.x*.7-t),.32*sin(p.x*1.2-t)+.19*cos(p.y*.8+t));
  float f=cos(w.x*2.2)+cos(w.y*2.3)+.6*cos((w.x+w.y)*1.6);
  float ca=exp(-pow((f-.6)/max(.20,fwidth(f)*1.2),2.))*(.55+.45*pow(sin(p.x*.45+p.y*.31+t),2.));
  c=1.-(1.-c)*(1.-tint*ca*m*intensity*.32);
 }else if(effect==2){
  vec2 d=vec2(sin(px.y/(28.*s)-t*3.)*.7+sin(px.y/(60.*s)+t*2.)*.3,sin(px.x/(35.*s)-t)*.16);
  vec3 shifted=texture(source,clamp(uv+d*intensity*11.*m/nativeSize,vec2(0),vec2(1))).rgb;
  c=mix(c,shifted,m);
 }else if(effect==3){
  float lum=dot(c,vec3(.2126,.7152,.0722));
  float threshold=mix(.18,.94,detail);
  float bright=smoothstep(threshold,min(1.,threshold+.12),lum);
  float starPhase=cloud(p*2.3)*30.;float wave=pow(max(0.,sin(starPhase+t)),8.);
  float broad=pow(max(0.,sin(starPhase+t+.10)),8.);
  c=1.-(1.-c)*(1.-tint*bright*wave*m*intensity);
  c*=1.-bright*(1.-broad)*m*intensity*.23;
 }else if(effect==4){
  float fog=shared?windCloud(p*.8,t,wind*strength*4.):billow(p*.8,t,wind);
  float a=smoothstep(.24,.87,fog)*mix(.12,1.1,density)*m*intensity;
  c=mix(c,tint*mix(.82,1.,fog),clamp(a,0.,.85));
 }else if(effect==5){
  float pulse=.45+.55*pow(.5+.5*sin(t+cloud(p*.5)*2.),2.);
  c=1.-(1.-c)*(1.-tint*pulse*m*intensity*.65);
 }else if(effect==6){
  float flicker=(.68+.18*sin(5.*t+cloud(p)*2.)+.09*sin(11.*t)+.05*sin(19.*t))*(.8+.2*billow(p,t,wind));
  c=1.-(1.-c)*(1.-tint*flicker*m*intensity*.55);
 }else if(effect==7){
  vec2 flow=shared?wind*strength+vec2(0.,.25):wind;flow=length(flow)>.001?normalize(flow):vec2(0,1);
  vec2 q=vec2(dot(px,vec2(flow.y,-flow.x)),dot(px,flow))/(105.*s);vec2 cell=floor(q),local=fract(q);vec3 light=vec3(0);
  for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){
   vec2 offset=vec2(float(x),float(y)),id=cell+offset;float h=hash(id);
   float life=fract(phase/6.28318530718*speed+h);float fade=pow(sin(life*3.14159265359),2.);
   vec2 pos=vec2(.2+.6*hash(id+9.)+.16*sin(t+h*27.),.5+(life-.5)*(shared?mix(.35,1.7,strength):1.7));
   vec2 d=local-offset-pos;float radius=mix(.018,.07,detail)*mix(.6,1.4,hash(id+4.));
   float core=exp(-dot(d,d)/(radius*radius));float halo=exp(-dot(d,d)/(radius*radius*9.))*.18;
   float twinkle=variant>1.5?pow(.5+.5*sin(t*2.+h*29.),3.):.7+.3*sin(t*3.+h*13.);
   vec3 colour=variant>.5&&variant<1.5?mix(tint,vec3(1.,.34,.055),.65):tint;
   light+=colour*(core+halo)*fade*twinkle*step(h,density);
  }
  c=1.-(1.-c)*(1.-clamp(light*m*intensity,0.,1.));
 }else if(effect==8){
  vec2 d=vec2(sin(p.y*1.8+t)+.5*sin(p.x*2.2-t),cos(p.x*1.3-t));
  vec3 moved=texture(source,clamp(uv+d*intensity*6.*m/nativeSize,vec2(0),vec2(1))).rgb;
  c=mix(c,moved,m);
 }
 if(effect==9&&variant<.5){
  float rain=rainField(px,fall,t,0.)+rainField(px+vec2(71,193),fall,t,.5)+rainField(px+vec2(193,37),fall,t,1.);
  // Fine spray between streaks helps the rainfall read against both light and dark maps.
  float spray=windCloud(p*1.3,t,fall*5.)*density*.055;
  vec2 q=px/(65.*s),cell=floor(q),local=fract(q)-.5;float seed=hash(cell+41.);
  float life=fract(phase/6.28318530718*speed*4.+seed);
  float ring=1.-smoothstep(.018,.018+pixelSize/(65.*s),abs(length(local*vec2(1.,1.5))-life*.3));
  float impact=ring*pow(1.-life,3.)*step(seed,density*.45)*splash;
  c=mix(c,tint,clamp((rain*.75+spray+impact*.35)*m*intensity,0.,.9));
 }else if(effect==9||effect==10){
  // Each cell owns a particle. Fade at birth/death hides its wrap, including at the loop seam.
  vec2 flow=shared?(effect==9&&variant<1.5?fall:normalize(wind*strength+vec2(0.,-.103))):wind;
  vec2 side=vec2(flow.y,-flow.x);vec2 q=vec2(dot(px,side),dot(px,flow))/(90.*s);
  vec2 cell=floor(q);vec2 local=fract(q);float amount=0.;vec3 colour=tint;vec3 leafLight=vec3(0);
  for(int ix=-1;ix<=1;ix++)for(int iy=-1;iy<=1;iy++){
   vec2 offset=vec2(float(ix),float(iy));float h=hash(cell+offset);
   float life=fract(phase/6.28318530718*speed+h);float fade=pow(sin(life*3.14159265359),2.);
   vec2 pos=vec2(.5+.25*sin(t+h*31.),(life-.5)*(shared&&effect==10?mix(.25,2.,strength):2.)+.5);vec2 d=local-offset-pos;
   float radius=effect==10?mix(.04,.25,detail):mix(.018,.13,detail);float shape;
   if(effect==10){
    float spin=t*2.+h*25.;d=mat2(cos(spin),-sin(spin),sin(spin),cos(spin))*d;
    float fold=.35+.65*abs(sin(t+h*17.));vec2 leaf=d/vec2(radius,radius*.55*fold);
    float edge=length(leaf);float lobes=variant>.5?1.+.13*cos(atan(leaf.y,leaf.x)*5.):1.;
    shape=1.-smoothstep(.75*lobes,lobes,edge);
    vec3 petal=variant>.5?mix(vec3(.76,.18,.035),vec3(1.,.66,.13),hash(cell+offset+8.)):tint;
    petal*=.75+.25*fold;leafLight+=petal*shape*fade*step(h,density);
   }else {if(variant>1.5)d.x*=2.4;shape=1.-smoothstep(radius*.25,radius+max(pixelSize/(90.*s),.002),length(d));}
   amount+=shape*fade*step(h, density);

  }
  if(effect==9&&variant>1.5){colour=mix(tint,vec3(.76,.52,.25),.8);amount=amount*.65+density*.65*(shared?windCloud(p,t,travel*2.):billow(p,t,wind));}
  if(effect==10&&amount>.0001)colour=leafLight/amount;
  c=mix(c,colour,clamp(amount*m*intensity,0.,1.));
 }else if(effect==11){
  float cycle=fract(phase/6.28318530718*speed);float flash=0.;
  for(int i=0;i<3;i++){float centre=.19+float(i)*.055;float d=abs(cycle-centre);flash+=exp(-pow(d/mix(.002,.013,detail),2.));}
  float x=fract(px.x/(950.*s));float y=px.y/(100.*s);
  float band=floor(px.x/(950.*s));float bolt=.5+.22*(noise(vec2(y*1.8,band))- .5)+.10*(noise(vec2(y*7.,band+8.))-.5);float distance=abs(x-bolt);
  float branch=abs(x-(bolt+.12*fract(y*.3)));
  float line=exp(-distance*500.)+.35*exp(-branch*650.);
  float light=flash*((variant>.5?line*(.55+.45*hash(vec2(band,4.))):0.)+density*(.20+.12*billow(p*.3,t,wind)))*m*intensity;
  c=1.-(1.-c)*(1.-tint*clamp(light,0.,1.));
 }else if(effect==12){
  vec2 drift=vec2(0.,1.2)+wind*strength*4.;float fog=shared?windCloud(p,t,drift):billow(p,t,wind);float wisps=shared?windCloud(p*1.8+3.,t,drift*1.4):billow(p*1.8+3.,t,wind);
  float a=smoothstep(.25,.78,fog)*mix(.2,1.3,density)*m*intensity;
  vec3 colour=variant>.5?mix(tint,vec3(1.),.55):tint*mix(.32,.85,wisps);
  c=mix(c,colour,clamp(a,0.,.92));
 }

 if(effect==13){
  vec2 drift=shared?wind*strength*5.:wind*3.;float cover=windCloud(p*.35,t,drift);
  float softness=mix(.07,.36,detail);float shade=smoothstep(.65-density*.3-softness,.65-density*.3+softness,cover);
  c*=mix(vec3(1.),mix(vec3(.30),tint,.25),shade*m*intensity*.8);
 }else if(effect==14){
  vec2 across=vec2(wind.y,-wind.x);float x=dot(px,across)/(140.*s),y=dot(px,wind)/(450.*s);
  float beams=pow(.5+.5*sin(x*2.1+sin(x*.63)*1.7+.18*sin(t+y)),mix(12.,2.,detail));
  float dapple=.45+.55*billow(vec2(x*.6,y),t,wind);
  float light=beams*dapple*(.65+.35*pow(sin(t+y*.25),2.))*m*intensity*density;
  c=1.-(1.-c)*(1.-tint*light*1.15);
 }else if(effect==15){
  vec2 q=px/(190.*s),cell=floor(q),local=fract(q);float ripple=0.;
  for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){
   vec2 offset=vec2(float(x),float(y)),id=cell+offset;float h=hash(id+19.);
   float life=fract(phase/6.28318530718*speed+h);vec2 centre=vec2(hash(id+4.),hash(id+7.));float r=length(local-offset-centre);
   float radius=life*mix(.35,.85,detail);float aa=max(pixelSize/(190.*s),.003);
   float ring=1.-smoothstep(.009,.009+aa,abs(r-radius));
   float echo=1.-smoothstep(.007,.007+aa,abs(r-radius*.72));
   ripple+=(ring+echo*.3)*pow(sin(life*3.14159265359),2.)*step(h,density);
  }
  c=1.-(1.-c)*(1.-tint*clamp(ripple*m*intensity*.45,0.,.6));
 }else if(effect==16){
  vec2 v=(px-vec2(origin.x,1.-origin.y)*nativeSize)/(210.*s);float r=length(v),a=atan(v.y,v.x);
  float aa=max(fwidth(r),.004);float outer=1.-smoothstep(.009,.009+aa,abs(r-1.));
  float inner=1.-smoothstep(.006,.006+aa,abs(r-.78));
  float runeAngle=(a+t)/6.28318530718*18.;float runeId=mod(floor(runeAngle),18.);
  vec2 glyph=vec2((fract(runeAngle)-.5)*2.,(r-.90)/.055);float signArm=hash(vec2(runeId,7.))>.5?1.:-1.;
  float stem=exp(-abs(glyph.x)*22.);float arm=exp(-abs(glyph.y-signArm*glyph.x*.85)*24.);
  float runeBox=(1.-smoothstep(.55,.72,abs(glyph.x)))*(1.-smoothstep(.65,.85,abs(glyph.y)));
  float runes=(stem+arm*.75)*runeBox;
  float arcs=pow(.5+.5*sin(a*6.-t*2.),5.)*(1.-smoothstep(.013,.013+aa,abs(r-1.12)));
  float tendrils=pow(.5+.5*sin(r*30.-a*5.+t*2.+sin(a*3.+t)),12.)*smoothstep(.15,.5,r)*(1.-smoothstep(.65,.8,r));
  float halo=exp(-pow((r-.93)/.18,2.))*.23;
  float light=(outer*.65+inner*.45+runes*.7+arcs*.8+tendrils*.4+halo)*(.85+.15*sin(t))*m*intensity;
  c=1.-(1.-c)*(1.-tint*clamp(light,0.,.95));
 }

 frag=vec4(clamp(c,0.,1.),1.);
}`;

export class Renderer{
 constructor(canvas){
  this.canvas=canvas;const gl=this.gl=canvas.getContext('webgl2',{alpha:false,antialias:false,preserveDrawingBuffer:true,premultipliedAlpha:false});
  if(!gl)throw Error('This editor needs WebGL 2. Enable graphics acceleration in your browser and reopen it.');
  const compile=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
  this.program=gl.createProgram();gl.attachShader(this.program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(this.program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(this.program);
  if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.program));
  gl.disable(gl.DITHER);gl.useProgram(this.program);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const a=gl.getAttribLocation(this.program,'position');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
  this.u={};for(const n of ['source','mask','nativeSize','renderSize','phase','effect','intensity','scale','speed','detail','tint','density','direction','variant','windStrength','rainLength','splash','origin','pixelSize'])this.u[n]=gl.getUniformLocation(this.program,n);
  gl.uniform1i(this.u.source,0);gl.uniform1i(this.u.mask,1);this.mapTexture=this.texture();this.blank=this.texture();gl.bindTexture(gl.TEXTURE_2D,this.blank);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));
  this.layerTextures=new Map();this.targets=[];
 }
 texture(){const g=this.gl,t=g.createTexture();g.bindTexture(g.TEXTURE_2D,t);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);return t;}
 setMap(image,width,height){
  const g=this.gl,max=g.getParameter(g.MAX_TEXTURE_SIZE);if(image.width>max||image.height>max||width>max||height>max)throw Error(`Your graphics card supports maps up to ${max} pixels on each side. This map has not been resized.`);
  this.native=[image.width,image.height];this.canvas.width=width;this.canvas.height=height;
  g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,this.mapTexture);g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,true);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,image);g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,false);
  for(const t of this.targets){g.deleteFramebuffer(t.fb);g.deleteTexture(t.texture);}this.targets=[];
  for(let i=0;i<2;i++){const texture=this.texture();g.texImage2D(g.TEXTURE_2D,0,g.RGBA,width,height,0,g.RGBA,g.UNSIGNED_BYTE,null);const fb=g.createFramebuffer();g.bindFramebuffer(g.FRAMEBUFFER,fb);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,texture,0);if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('The graphics card cannot render this map at its native size.');this.targets.push({texture,fb});}g.bindFramebuffer(g.FRAMEBUFFER,null);
 }
 render(layers,time,duration,original=false,environment={direction:90,strength:0}){
  const g=this.gl;if(!this.native)return;g.useProgram(this.program);g.viewport(0,0,this.canvas.width,this.canvas.height);g.uniform2f(this.u.nativeSize,...this.native);g.uniform2f(this.u.renderSize,this.canvas.width,this.canvas.height);g.uniform1f(this.u.pixelSize,Math.max(this.native[0]/this.canvas.width,this.native[1]/this.canvas.height));g.uniform1f(this.u.phase,Math.PI*2*((time%duration)/duration));
  const active=original?[]:layers.filter(l=>l.visible);let input=this.mapTexture;
  const present=new Set(layers.map(l=>l.id));for(const [id,t] of this.layerTextures){if(!present.has(id)){g.deleteTexture(t.texture);this.layerTextures.delete(id);}}
  for(let i=0;i<active.length;i++){
   const l=active[i],target=this.targets[i%2];let cached=this.layerTextures.get(l.id);
   if(!cached){cached={texture:this.texture(),revision:-1};this.layerTextures.set(l.id,cached);}
   g.activeTexture(g.TEXTURE1);g.bindTexture(g.TEXTURE_2D,cached.texture);
   if(cached.revision!==l.revision){g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,true);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,l.mask);g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,false);cached.revision=l.revision;}
   g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,input);g.bindFramebuffer(g.FRAMEBUFFER,target.fb);
   g.uniform1i(this.u.effect,l.type);for(const n of ['intensity','scale','speed','detail','density','direction','variant'])g.uniform1f(this.u[n],l[n]??(n==='density'?.6:0));
   const follow=l.followWind&&[4,7,9,10,12,13].includes(l.type);g.uniform1f(this.u.windStrength,follow?environment.strength:-1);if(follow)g.uniform1f(this.u.direction,environment.direction);g.uniform1f(this.u.rainLength,l.rainLength??.55);g.uniform1f(this.u.splash,l.splash??.25);g.uniform2f(this.u.origin,l.originX??.5,l.originY??.5);
   const color=l.color.match(/\w\w/g).map(x=>parseInt(x,16)/255);g.uniform3f(this.u.tint,...color);g.drawArrays(g.TRIANGLES,0,6);input=target.texture;
  }
  g.bindFramebuffer(g.FRAMEBUFFER,null);g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,input);g.activeTexture(g.TEXTURE1);g.bindTexture(g.TEXTURE_2D,this.blank);g.uniform1i(this.u.effect,0);g.drawArrays(g.TRIANGLES,0,6);
  if(g.isContextLost())throw Error('Graphics memory was exhausted. Close other graphics-heavy tabs and try again.');
 }
 dispose(){const g=this.gl;g.getExtension('WEBGL_lose_context')?.loseContext();}
}
