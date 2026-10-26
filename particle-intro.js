import * as THREE from './assets/vendor/three.module.min.js';

// Dust and flowing filaments are 3D geometry; this scene uses no picture texture.
export function createWaterIntro(renderer){
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,.1,100);
 camera.position.z=28;
 const narrow=innerWidth<701,count=narrow?58000:128000,ribbonCount=narrow?44:80,streamletCount=narrow?1800:4200;
 const state={exit:0,age:0},point=new THREE.Vector2(),target=new THREE.Vector2();
 let previous=null,energy=0,lastX=0,lastY=0,disposed=false;
 const uniforms={uTime:{value:0},uAge:{value:0},uAspect:{value:camera.aspect},uScale:{value:innerHeight*renderer.getPixelRatio()},uOpacity:{value:1},uEnergy:{value:0},uPointer:{value:point}};
 const field=`uniform float uTime,uAge,uAspect,uScale,uOpacity,uEnergy;uniform vec2 uPointer;
 float arrival(float y){float front=20.-min(uAge,6.)*6.5;return smoothstep(front-1.2,front+1.8,y);}
 float axis(float y){float down=1.-smoothstep(-14.,14.,y);return 11.6*uAspect*(-.50+.38*down)+sin(y*.22-uTime*.12)*1.5+sin(y*.46+uTime*.08)*.55;}
 vec3 stream(float y,float seed,vec2 crossSection){float phase=y*.56+uTime*.48+floor(seed*48.)*.43;float width=8.4+sin(y*.28-uTime*.09)*1.6;float curl=sin(y*1.6+seed*27.-uTime*.7)*.20+sin(y*2.8+seed*19.+uTime*.25)*.12;return vec3(axis(y)+crossSection.x*width+sin(phase)*1.5+curl,y,crossSection.y+cos(phase)*1.6+sin(y*.21-uTime*.12)*.7);}
 vec3 current(vec3 p){vec2 d=p.xy-uPointer;float f=exp(-dot(d,d)/6.5)*uEnergy;vec2 n=normalize(d+vec2(.001));p.xy+=(n*1.8+vec2(-n.y,n.x)*1.3)*f;p.z+=f*.8;return p;}`;
 const background=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,depthTest:false,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,.999,1.);}',fragmentShader:`varying vec2 vUv;${field}
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
 void main(){vec2 uv=vUv;float t=uTime*.1,depth=1.1-uv.y,source=mix(.38,.25,smoothstep(.7,1.5,uAspect));float x=(uv.x-source)/(depth+.15);float shafts=0.;
 for(int k=0;k<9;k++){float f=float(k);float center=(f-4.)*.095+sin(f*2.3+t)*.02;float width=.026+.012*sin(f*1.7);shafts+=exp(-pow((x-center)/width,2.))*(.045+.018*sin(f*3.+t))*exp(-depth*.6);}
 float mist=noise(vec2(uv.x*4.+t*.1,uv.y*3.-t*.17))*.7+noise(vec2(uv.x*9.-t*.07,uv.y*7.+t*.13))*.3;
 vec3 color=mix(vec3(.001,.006,.018),vec3(.004,.026,.062),uv.y*.7+mist*.22);float fill=smoothstep(0.,3.5,uAge);color+=vec3(.11,.29,.62)*shafts*(.2+.8*fill);
 vec2 sun=(uv-vec2(source,1.04))*vec2(1.,.75);color+=vec3(.055,.17,.26)*exp(-dot(sun,sun)*24.)*(.15+.85*fill);
 float curtain=exp(-pow((uv.x-(source+sin(uv.y*5.+t)*.035))/.27,2.));color+=vec3(.007,.036,.085)*curtain*mist*fill;color*=.53*(1.-.62*smoothstep(.46,.93,uv.x));color+=vec3(.20,.44,.78)*exp(-dot(sun,sun)*30.)*fill;
 gl_FragColor=vec4(color,uOpacity);
 #include <colorspace_fragment>
 }`}));background.frustumCulled=false;background.renderOrder=-100;scene.add(background);
 let seed=73183;const rand=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};
 const positions=new Float32Array(count*3),seeds=new Float32Array(count),phases=new Float32Array(count),sizes=new Float32Array(count),types=new Float32Array(count);
 for(let k=0;k<count;k++){const type=k<100?2:k<count*.075?1:k<count*.105?3:0;types[k]=type;positions.set([(rand()+rand()+rand()-1.5)/1.5,(rand()-.5)*36,type===2?8+rand()*8:type===1?-16+rand()*22:(rand()-.5)*7],k*3);seeds[k]=rand();phases[k]=rand();sizes[k]=type===2?.6+rand()*1.5:type===3?.4+rand()*.8:type===1?.028+rand()*.06:.019+Math.pow(rand(),6)*.18;}
 const geometry=new THREE.BufferGeometry();for(const [name,data,size] of [['position',positions,3],['aSeed',seeds,1],['aPhase',phases,1],['aSize',sizes,1],['aType',types,1]])geometry.setAttribute(name,new THREE.BufferAttribute(data,size));
 const particles=new THREE.Points(geometry,new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:`${field}attribute float aSeed,aPhase,aSize,aType;varying float vAlpha,vType,vLight;
 void main(){bool flowing=aType<.5||aType>2.5;float speed=flowing?(.60+aSeed*.55):(.18+aSeed*.22);float y=18.-mod(aPhase*36.+uTime*speed,36.);vec3 p=position;p.y=y;
 if(flowing){p=stream(y,aSeed,position.xz);}
 else{p.x=position.x*18.*uAspect+sin(y*.19+uTime*.15+aSeed*12.)*.5;p.y+=sin(uTime*.2+aSeed*6.)*.25;}
 p=current(p);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(aSize*uScale*1.65/max(1.,-mv.z),.75,aType>1.5?105.:14.);
 vAlpha=(aType>2.5?.006:aType>1.5?.16:aType>.5?.19:.56)*smoothstep(-18.,-14.,y)*(1.-smoothstep(15.,18.,y))*arrival(y);vType=aType;vLight=.45+.55*pow(.5+.5*sin(aSeed*94.+y*.8+uTime*.4),2.);
 }`,fragmentShader:`uniform float uOpacity;varying float vAlpha,vType,vLight;
 void main(){vec2 q=gl_PointCoord-.5;float r=length(q)*2.;if(r>1.)discard;float a=vType>1.5?exp(-r*r*5.)*(1.-smoothstep(.35,1.,r)):exp(-r*r*16.)+exp(-r*r*3.)*.065;vec3 color=vType>1.5?vec3(.10,.39,.78):mix(vec3(.10,.35,.80),vec3(.88,.96,1.),vLight);gl_FragColor=vec4(color,a*vAlpha*uOpacity);
 #include <colorspace_fragment>
 }`}));particles.frustumCulled=false;scene.add(particles);
 // Twisting translucent strips occupy the same 3D current as the points.
 const segments=narrow?150:230,verts=[],along=[],sides=[],lanes=[],indices=[];
 for(let k=0;k<ribbonCount;k++)for(let j=0;j<=segments;j++){const y=18-j/segments*36;for(const side of [-1,1]){verts.push(0,y,0);along.push(y);sides.push(side);lanes.push(k/ribbonCount);}if(j<segments){const a=(k*(segments+1)+j)*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}}
 const ribbonGeometry=new THREE.BufferGeometry();ribbonGeometry.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));ribbonGeometry.setAttribute('aAlong',new THREE.Float32BufferAttribute(along,1));ribbonGeometry.setAttribute('aSide',new THREE.Float32BufferAttribute(sides,1));ribbonGeometry.setAttribute('aLane',new THREE.Float32BufferAttribute(lanes,1));ribbonGeometry.setIndex(indices);
 const ribbons=new THREE.Mesh(ribbonGeometry,new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,vertexShader:`${field}attribute float aAlong,aSide,aLane;varying float vSide,vY,vLane;
 void main(){float y=aAlong;float phase=y*(.48+aLane*.12)+uTime*(.48+aLane*.22)+aLane*25.13;float radius=.80+aLane*4.4+sin(y*.28-uTime*.16+aLane*6.)*.6;vec3 p=vec3(axis(y)+sin(phase)*radius,y,cos(phase)*radius*.6+sin(y*.19+uTime*.1)*.5);p.x+=aSide*(.012+.022*aLane);p=current(p);vSide=aSide;vY=y;vLane=aLane;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
 }`,fragmentShader:`${field}varying float vSide,vY,vLane;
 void main(){float edge=pow(1.-abs(vSide),1.3);float flow=pow(.5+.5*sin(vY*1.2+uTime*2.+vLane*28.),7.);float second=pow(.5+.5*sin(vY*.43+uTime*.8-vLane*16.),10.);float a=edge*(.018+flow*.09+second*.035)*arrival(vY)*smoothstep(-18.,-13.,vY)*(1.-smoothstep(15.,18.,vY));gl_FragColor=vec4(mix(vec3(.14,.55,.89),vec3(.72,.94,1.),flow),a*uOpacity);
 #include <colorspace_fragment>
 }`}));ribbons.frustumCulled=false;scene.add(ribbons);
 // Short curved streamlets share the point trajectories, making the water's current legible.
 const sp=[],ss=[],sf=[],se=[];
 for(let k=0;k<streamletCount;k++){const x=(rand()+rand()+rand()-1.5)/1.5,z=(rand()-.5)*7,seed=rand(),phase=rand(),length=.15+rand()*.4;for(let j=0;j<6;j++)for(const end of [j/6,(j+1)/6]){sp.push(x,0,z);ss.push(seed);sf.push(phase);se.push(end*length);}}
 const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(sp,3));sg.setAttribute('aSeed',new THREE.Float32BufferAttribute(ss,1));sg.setAttribute('aPhase',new THREE.Float32BufferAttribute(sf,1));sg.setAttribute('aEnd',new THREE.Float32BufferAttribute(se,1));
 const streamlets=new THREE.LineSegments(sg,new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:`${field}attribute float aSeed,aPhase,aEnd;varying float vAlpha;void main(){float y=18.-mod(aPhase*36.+uTime*(.6+aSeed*.55),36.)-aEnd;vec3 p=current(stream(y,aSeed,position.xz));vAlpha=(.02+pow(aSeed,5.)*.08)*arrival(y)*smoothstep(-18.,-13.,y)*(1.-smoothstep(15.,18.,y));gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,fragmentShader:`uniform float uOpacity;varying float vAlpha;void main(){gl_FragColor=vec4(.42,.73,1.,vAlpha*uOpacity);\n#include <colorspace_fragment>\n}`}));streamlets.frustumCulled=false;scene.add(streamlets);
 return {scene,camera,state,complete(){state.age=Math.max(state.age,6);},resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();uniforms.uAspect.value=camera.aspect;uniforms.uScale.value=innerHeight*renderer.getPixelRatio();},update(time,pointer,reduced){
 const dt=previous===null?0:Math.min(.06,Math.max(0,time-previous));previous=time;if(reduced)state.age=6;else state.age+=dt;uniforms.uTime.value=reduced?0:state.age;uniforms.uAge.value=state.age;
 target.set(pointer.x*23.2*camera.aspect,pointer.y*23.2);const speed=Math.hypot(pointer.x-lastX,pointer.y-lastY);lastX=pointer.x;lastY=pointer.y;const wanted=reduced?0:Math.min(1,speed*95);energy+=(wanted-energy)*(1-Math.exp(-Math.max(dt,.016)*5));point.lerp(target,.09);uniforms.uEnergy.value=energy;uniforms.uOpacity.value=1-state.exit;camera.position.set(reduced?0:pointer.x*.25,reduced?0:pointer.y*.15,28-state.exit*8);camera.lookAt(0,0,0);
 },info(){return {particles:count,ribbons:ribbonCount,streamlets:streamletCount,particleDriven:true,sourceImage:false,imageReady:true,age:state.age,arrival:Math.min(1,state.age/6),interaction:energy,exit:state.exit,sampleY:18-((.2*36+state.age*.85)%36)};},dispose(){if(disposed)return;disposed=true;for(const o of [background,particles,ribbons,streamlets]){o.geometry.dispose();o.material.dispose();}}};
}
