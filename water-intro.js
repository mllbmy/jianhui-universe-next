import * as THREE from './assets/vendor/three.module.min.js';

// A separate, persistent underwater scene. The universe is revealed only on entry.
export function createWaterIntro(renderer){
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,.1,240);
 camera.position.z=28;
 const state={exit:0,age:0},point=new THREE.Vector2(),target=new THREE.Vector2();let energy=0,lastTime=0,lastX=0,lastY=0,imageReady=false,disposed=false;
 const placeholder=new THREE.DataTexture(new Uint8Array([3,14,26,255]),1,1);placeholder.needsUpdate=true;
 const uniforms={uTime:{value:0},uPhoto:{value:0},uLayer:{value:0},uLayerStrength:{value:1},uOverscan:{value:4.2},uAspect:{value:innerWidth/innerHeight},uOpacity:{value:1},uPointer:{value:point},uEnergy:{value:0},uScale:{value:innerHeight*renderer.getPixelRatio()},uImage:{value:placeholder},uImageAspect:{value:16/9},uReady:{value:0}};
 // Reuse the already fetched responsive poster instead of downloading the same image again.
 const poster=document.querySelector('#entry-image');
 const usePoster=()=>{if(disposed||imageReady||!poster?.naturalWidth)return;poster.width=poster.naturalWidth;poster.height=poster.naturalHeight;const texture=new THREE.Texture(poster);texture.needsUpdate=true;texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());uniforms.uImageAspect.value=poster.naturalWidth/poster.naturalHeight;uniforms.uImage.value=texture;imageReady=true;};
 if(poster?.complete)usePoster();else poster?.addEventListener('load',usePoster,{once:true});
 const noise=`float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}float cloud(vec2 p){return noise(p)*.55+noise(p*2.1)*.28+noise(p*4.3)*.17;}`;
 const background=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,depthTest:false,vertexShader:`varying vec2 vUv;uniform float uOverscan;void main(){vUv=(uv-.5)*uOverscan+.5;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`
 varying vec2 vUv;uniform float uTime,uLayer,uLayerStrength,uAspect,uOpacity,uEnergy,uReady,uImageAspect,uPhoto;uniform vec2 uPointer;uniform sampler2D uImage;${noise}
 void main(){vec2 uv=vUv;float t=uTime*.15;float depth=1.15-uv.y;float source=.32+sin(t*.5)*.018;
 float drift=sin(depth*4.+t)*.018+sin(depth*9.-t*.7)*.008;float rayX=(uv.x-source-drift)/(depth+.17);
 float shafts=0.;for(int i=0;i<11;i++){float k=float(i);float lane=(k-5.)*.115+sin(k*2.3+t*.4)*.028;float width=(.024+.025*(.5+.5*sin(k*3.)))*(1.+depth*.2);lane+=sin(depth*6.+k*2.+t)*.012;float ray=exp(-pow((rayX-lane)/width,2.));shafts+=ray*(.12+.20*noise(vec2(k,t*.3)))*exp(-depth*.65);}
 float broad=exp(-pow(rayX/.52,2.))*.23;float cloudiness=cloud(vec2(uv.x*5.+t*.1,uv.y*3.-t*.13));
 vec3 color=mix(vec3(.005,.022,.042),vec3(.018,.085,.145),uv.y*.65+cloudiness*.2);
 color+=vec3(.10,.29,.47)*(shafts+broad)*(0.7+cloudiness*.5);
 vec2 sun=(uv-vec2(source,1.06))*vec2(1.1,.7);float bloom=exp(-dot(sun,sun)*26.);color+=vec3(.24,.48,.65)*bloom*.8;
 float plume=exp(-pow((uv.x-(.30+sin(uv.y*5.+t)*.045))/.17,2.));color+=vec3(.025,.09,.15)*plume*cloudiness;
 vec2 pointerUv=uPointer/vec2(23.2*uAspect,23.2)+.5;float touch=exp(-length((uv-pointerUv)*vec2(uAspect,1.))*7.)*uEnergy;color+=vec3(.015,.06,.09)*touch;
 color*=.82+.18*smoothstep(0.,.25,uv.y);
 vec2 crop=vec2(min(1.,uAspect/uImageAspect),min(1.,uImageAspect/uAspect));
 float center=mix(.36,.5,smoothstep(.75,1.35,uAspect));vec2 imageUv=(uv-.5)*crop*.96+vec2(center,.5);
 // A travelling displacement field makes the pictured veil billow in water.
 float flowTime=uTime*.27;float curtain=exp(-pow((imageUv.x-.34)/.29,2.));
 imageUv.x+=(sin(imageUv.y*8.+flowTime)*.007+sin(imageUv.y*17.-flowTime*.7)*.003)*curtain;
 imageUv.y+=(sin(imageUv.x*10.-flowTime)*.004+sin(imageUv.y*7.+flowTime*.5)*.004)*curtain;
 vec2 cursor=(uv-pointerUv)*vec2(uAspect,1.);float wake=exp(-dot(cursor,cursor)*17.)*uEnergy;
 imageUv+=vec2(cursor.x-cursor.y*.7,cursor.y+cursor.x*.7)*wake*.042*crop;
 vec3 sampleColor=texture2D(uImage,clamp(imageUv,vec2(.002),vec2(.998))).rgb;
 float imageDepth=dot(sampleColor,vec3(.2126,.7152,.0722));imageUv+=uPointer/vec2(23.2*uAspect,23.2)*crop*(.005+imageDepth*.01);
 vec3 picture=texture2D(uImage,clamp(imageUv,vec2(.002),vec2(.998))).rgb;
 // Two continuously advected fields hand over before each cycle resets.
 float phaseA=fract(uTime*.105),phaseB=fract(phaseA+.5);float weightA=1.-abs(phaseA*2.-1.);
 vec2 current=vec2(sin(imageUv.y*8.-uTime*.32)*.048,.34);
 vec2 uvA=imageUv+current*(phaseA-.5),uvB=imageUv+current*(phaseB-.5);
 uvA.x+=sin(uvA.y*10.-uTime*.55)*.012*curtain;uvB.x+=sin(uvB.y*10.-uTime*.55)*.012*curtain;
 vec3 movingA=texture2D(uImage,clamp(uvA,vec2(.002),vec2(.998))).rgb;
 vec3 movingB=texture2D(uImage,clamp(uvB,vec2(.002),vec2(.998))).rgb;
 vec3 travelling=mix(movingB,movingA,weightA)*1.06;
 float flowingVeil=curtain*.96*smoothstep(.01,.16,imageUv.y)*(1.-smoothstep(.86,1.,imageUv.y));
 picture=mix(picture,travelling,flowingVeil);
 picture*=.98+.02*sin(uTime*.36+imageUv.y*4.);
 float imageBounds=smoothstep(-.025,.065,imageUv.x)*(1.-smoothstep(.935,1.025,imageUv.x))*smoothstep(-.025,.065,imageUv.y)*(1.-smoothstep(.935,1.025,imageUv.y));
 color=picture;
 float layerAlpha=imageBounds;
 if(uLayer>.5){float luminance=dot(picture,vec3(.2126,.7152,.0722));float key=smoothstep(.09,.65,luminance);layerAlpha=key*curtain*.65*uLayerStrength*uReady*imageBounds;color=picture;}
 gl_FragColor=vec4(color,uOpacity*layerAlpha*uPhoto);
 #include <colorspace_fragment>
 }
 `}));background.frustumCulled=false;background.renderOrder=-100;background.position.z=-8;scene.add(background);
 // An unbounded water atmosphere keeps oblique views free of card edges.
 const atmosphere=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({uniforms,depthTest:false,depthWrite:false,vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,.9999,1.);}`,fragmentShader:`varying vec2 vUv;uniform float uTime,uOpacity;void main(){vec2 p=vUv;float t=uTime*.12;float light=exp(-pow((p.x-.25)/(.4+(1.-p.y)*.3),2.))*pow(p.y,1.8);float haze=.5+.5*sin(p.x*3.+p.y*4.+t);vec3 c=vec3(.003,.017,.032)+vec3(.015,.065,.10)*light+vec3(.001,.006,.012)*haze;gl_FragColor=vec4(c,uOpacity);}`}));atmosphere.frustumCulled=false;atmosphere.renderOrder=-110;scene.add(atmosphere);
 // Parallel image cards at two depths, with point sprites in front: a 2.5D stage.
 const veilMaterial=background.material.clone();veilMaterial.uniforms={...uniforms,uLayer:{value:1}};
 const veil=new THREE.Mesh(background.geometry,veilMaterial);veil.position.z=1;veil.renderOrder=-90;veil.frustumCulled=false;scene.add(veil);
 const cameraStage={progress:0,yaw:0,farX:0,midX:0},farProbe=new THREE.Vector3(),midProbe=new THREE.Vector3();
 function fitCards(){for(const card of [background,veil]){const h=2*Math.tan(Math.PI/8)*(28-card.position.z)*uniforms.uOverscan.value;card.scale.set(h*camera.aspect/2,h/2,1);}}
 fitCards();
 let seed=9182;const rand=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};
 const narrow=innerWidth<701,count=narrow?32000:72000,positions=new Float32Array(count*3),sizes=new Float32Array(count),seeds=new Float32Array(count),types=new Float32Array(count);
 for(let k=0;k<count;k++){const type=k<90?2:k<count*.17?1:0;types[k]=type;const x=type===0?(rand()+rand()+rand()-1.5)*2/1.5:rand()*2-1;positions.set([x,rand()*36-18,type===2?7+rand()*8:type===1?-15+rand()*20:-5+rand()*8],k*3);seeds[k]=rand();sizes[k]=type===2?.45+rand()*1.1:type===1?.025+rand()*.05:.025+Math.pow(rand(),4)*.16;}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));geometry.setAttribute('aSeed',new THREE.BufferAttribute(seeds,1));geometry.setAttribute('aType',new THREE.BufferAttribute(types,1));
 const particles=new THREE.Points(geometry,new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:`
 attribute float aSize,aSeed,aType;uniform float uTime,uAspect,uScale,uEnergy,uPhoto;uniform vec2 uPointer;varying float vAlpha,vType,vLight;
 void main(){float t=uTime;vec3 p=position;float velocity=aType<.5?(.58+aSeed*.58):(.12+aSeed*.18);float wrap=mod(p.y+18.-t*velocity,36.)-18.;p.y=wrap;float flow=sin(wrap*.22+t*.14)*3.1+sin(wrap*.51-t*.11)*1.1;float span=min(uAspect,2.2)/1.6;
 if(aType<.5){float ribbon=sin(wrap*.66+floor(aSeed*24.)*.38-t*.42)*1.05;float spread=3.2+sin(wrap*.26-t*.08)*.9;p.x=(position.x*spread-5.1+flow+ribbon)*span;p.z+=sin(wrap*.21+t*.22+aSeed*9.)*.65;}
 else{p.x=position.x*14.*uAspect+sin(wrap*.14+t*.12+aSeed*6.)*.7;p.y+=sin(t*.22+aSeed*12.)*.35;}
 // Full-volume helixes: distinct world-space depth, not a rotated texture card.
 vec3 volume=p;float strand=floor(aSeed*3.);float theta=wrap*.32+strand*2.0943951-t*.32;
 float radius=3.6+sin(strand*2.3)*.8+position.x*.45+sin(wrap*.45+strand)*.35;
 if(aType<.5){volume.x=-4.2*span+sin(wrap*.18+t*.12)*1.8+cos(theta)*radius;volume.z=sin(theta)*radius+position.z*.055;volume.y=wrap;}
 else{volume.x=position.x*19.;volume.z=position.z*1.65;volume.y=wrap;}
 p=mix(volume,p,uPhoto);
 vec2 delta=p.xy-uPointer;float force=exp(-dot(delta,delta)/5.)*uEnergy;vec2 direction=normalize(delta+vec2(.001));p.xy+=(direction*1.1+vec2(-direction.y,direction.x)*.85)*force;p.z+=force*.65;
 vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(aSize*uScale*mix(2.6,1.25,uPhoto)/max(1.,-mv.z),.65,aType>1.5?100.:9.);
 vAlpha=(aType>1.5?.15:aType>.5?.35:.72)*smoothstep(-18.,-13.,wrap)*(1.-smoothstep(13.,18.,wrap));vAlpha*=mix(1.65,.42,uPhoto);vLight=(.6+.4*sin(aSeed*91.+t*.4))*(.6+.4*cos(theta-.7));vType=aType;}
 `,fragmentShader:`uniform float uOpacity;varying float vAlpha,vType,vLight;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;float alpha;vec3 color;if(vType>1.5){alpha=exp(-r*r*4.)*(1.-smoothstep(.5,1.,r));color=vec3(.28,.65,.92);}else{alpha=exp(-r*r*16.)+pow(1.-r,3.)*.28;color=mix(vec3(.25,.58,.85),vec3(.80,.94,1.),vLight);}gl_FragColor=vec4(color,alpha*vAlpha*uOpacity);}`}));particles.frustumCulled=false;scene.add(particles);
 return {scene,camera,state,complete(){state.age=Math.max(state.age,5.0);},resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();uniforms.uAspect.value=camera.aspect;uniforms.uScale.value=innerHeight*renderer.getPixelRatio();fitCards();},update(time,pointer,reduced){
  const dt=lastTime===0?0:Math.min(.06,Math.max(0,time-lastTime));lastTime=time;if(reduced)state.age=5.0;else if(imageReady)state.age+=dt;target.set(pointer.x*23.2*camera.aspect,pointer.y*23.2);const speed=Math.hypot(pointer.x-lastX,pointer.y-lastY);lastX=pointer.x;lastY=pointer.y;const wanted=reduced?0:Math.min(1,speed*85);energy+=(wanted-energy)*(1-Math.exp(-Math.max(dt,.016)*4));point.lerp(target,.065);uniforms.uTime.value=reduced?0:state.age;uniforms.uEnergy.value=energy;uniforms.uOpacity.value=1-state.exit;if(imageReady)uniforms.uReady.value=1;
  const progress=Math.min(1,state.age/5.0),e=progress*progress*progress*(progress*(progress*6.-15.)+10.),remaining=1-e;
  const span=Math.min(1,Math.max(.65,camera.aspect/1.55));
  const angle=110*Math.PI/180*remaining,radius=28+5*Math.sin(Math.PI*e);
  const targetX=-4.2*span*remaining,targetY=0;
  camera.position.set(targetX+Math.sin(angle)*radius+(reduced?0:pointer.x*.4*e),3.5*Math.sin(Math.PI*e)+(reduced?0:pointer.y*.25*e),Math.cos(angle)*radius-state.exit*8);
  camera.lookAt(targetX,targetY,0);camera.updateMatrixWorld();
  const photoStart=.88,photoT=Math.max(0,Math.min(1,(e-photoStart)/(1-photoStart))),photo=photoT*photoT*(3.-2.*photoT);
  uniforms.uPhoto.value=photo;uniforms.uLayerStrength.value=1-e;veil.visible=false;
  background.visible=imageReady&&photo>0;
  farProbe.set(0,0,background.position.z).project(camera);midProbe.set(0,0,veil.position.z).project(camera);
  Object.assign(cameraStage,{progress,yaw:Math.atan2(camera.position.x-targetX,camera.position.z)*180/Math.PI,farX:farProbe.x,midX:midProbe.x});
 },info(){return {variant:"3d-volume",particles:count,sourceImage:true,restored:true,age:state.age,arrival:cameraStage.progress,labelReady:cameraStage.progress>=.92,photoReveal:uniforms.uPhoto.value,orbitDegrees:110*(1-(cameraStage.progress**3*(cameraStage.progress*(cameraStage.progress*6-15)+10))),camera:{x:camera.position.x,y:camera.position.y,z:camera.position.z,yaw:cameraStage.yaw,roll:camera.rotation.z*180/Math.PI},layers:[{depth:background.position.z,screenX:cameraStage.farX},{depth:veil.position.z,screenX:cameraStage.midX},{depth:12}],interaction:energy,exit:state.exit,imageReady};},dispose(){disposed=true;uniforms.uImage.value.dispose();if(uniforms.uImage.value!==placeholder)placeholder.dispose();geometry.dispose();particles.material.dispose();background.geometry.dispose();background.material.dispose();veil.material.dispose();atmosphere.geometry.dispose();atmosphere.material.dispose();}};
}
