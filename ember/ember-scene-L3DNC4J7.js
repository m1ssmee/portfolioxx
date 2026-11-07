import{$ as Ca,A as g,C as bt,D as $t,E as Gs,F as Ue,G as Gt,H as Dt,I as Ve,J as Ns,K as Qo,L as qs,M as ae,N as js,O as Va,P as ft,Q as Ft,R as Xo,S as $o,T as Te,U as Jo,V as Ys,W as Zs,X as Ws,Y as Ks,Z as Qs,_ as Xs,a as It,aa as za,b as Ot,ba as La,c as Ds,ca as Jt,d as Xt,da as Ba,e as Fs,ea as Ua,f as vo,fa as Se,g as Vs,ga as Ze,h as rt,ha as $s,i as Aa,ia as Js,j as ka,ja as en,k as Cs,ka as ea,l as wo,la as ta,m as zs,ma as Ia,n as Da,na as tn,o as yo,oa as xt,p as Ls,pa as on,q as Bs,qa as an,r as yt,ra as St,s as Ko,sa as sn,t as Us,ta as oa,u as Is,v as Fa,w as Os,x as le,y as q,z as Ee}from"./ember-chunk-23SYQ3AD.js";import"./ember-chunk-LNKPV2WA.js";var nn={type:"change"},Ga={type:"start"},ln={type:"end"},aa=new Xo,rn=new Ft,mr=Math.cos(70*le.DEG2RAD),_e=new g,We=2*Math.PI,re={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},Oa=1e-6,sa=class extends tn{constructor(e,s=null){super(e,s),this.state=re.NONE,this.target=new g,this.cursor=new g,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:It.ROTATE,MIDDLE:It.DOLLY,RIGHT:It.PAN},this.touches={ONE:Ot.ROTATE,TWO:Ot.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle="auto",this._domElementKeyEvents=null,this._lastPosition=new g,this._lastQuaternion=new Ee,this._lastTargetPosition=new g,this._quat=new Ee().setFromUnitVectors(e.up,new g(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new Ia,this._sphericalDelta=new Ia,this._scale=1,this._panOffset=new g,this._rotateStart=new q,this._rotateEnd=new q,this._rotateDelta=new q,this._panStart=new q,this._panEnd=new q,this._panDelta=new q,this._dollyStart=new q,this._dollyEnd=new q,this._dollyDelta=new q,this._dollyDirection=new g,this._mouse=new q,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=dr.bind(this),this._onPointerDown=fr.bind(this),this._onPointerUp=pr.bind(this),this._onContextMenu=Er.bind(this),this._onMouseWheel=wr.bind(this),this._onKeyDown=yr.bind(this),this._onTouchStart=br.bind(this),this._onTouchMove=xr.bind(this),this._onMouseDown=gr.bind(this),this._onMouseMove=vr.bind(this),this._interceptControlDown=Tr.bind(this),this._interceptControlUp=Mr.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}set cursorStyle(e){this._cursorStyle=e,e==="grab"?this.domElement.style.cursor="grab":this.domElement.style.cursor="auto"}get cursorStyle(){return this._cursorStyle}connect(e){super.connect(e),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.ownerDocument.addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.state=re.NONE,this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.ownerDocument.removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.ownerDocument.removeEventListener("keyup",this._interceptControlUp,{capture:!0}),this._controlActive=!1,this._pointers.length=0,this._pointerPositions={},this.domElement.style.touchAction="",this.domElement.style.cursor="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(e){e.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=e}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(nn),this.update(),this.state=re.NONE}pan(e,s){this._pan(e,s),this.update()}dollyIn(e){this._dollyIn(e),this.update()}dollyOut(e){this._dollyOut(e),this.update()}rotateLeft(e){this._rotateLeft(e),this.update()}rotateUp(e){this._rotateUp(e),this.update()}update(e=null){let s=this.object.position;_e.copy(s).sub(this.target),_e.applyQuaternion(this._quat),this._spherical.setFromVector3(_e),this.autoRotate&&this.state===re.NONE&&this._rotateLeft(this._getAutoRotationAngle(e)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let r=this.minAzimuthAngle,u=this.maxAzimuthAngle;isFinite(r)&&isFinite(u)&&(r<-Math.PI?r+=We:r>Math.PI&&(r-=We),u<-Math.PI?u+=We:u>Math.PI&&(u-=We),r<=u?this._spherical.theta=Math.max(r,Math.min(u,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(r+u)/2?Math.max(r,this._spherical.theta):Math.min(u,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let p=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{let i=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),p=i!=this._spherical.radius}if(_e.setFromSpherical(this._spherical),_e.applyQuaternion(this._quatInverse),s.copy(this.target).add(_e),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let i=null;if(this.object.isPerspectiveCamera){let d=_e.length();i=this._clampDistance(d*this._scale);let o=d-i;this.object.position.addScaledVector(this._dollyDirection,o),this.object.updateMatrixWorld(),p=!!o}else if(this.object.isOrthographicCamera){let d=new g(this._mouse.x,this._mouse.y,0);d.unproject(this.object);let o=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),p=o!==this.object.zoom;let y=new g(this._mouse.x,this._mouse.y,0);y.unproject(this.object),this.object.position.sub(y).add(d),this.object.updateMatrixWorld(),i=_e.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;i!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(i).add(this.object.position):(aa.origin.copy(this.object.position),aa.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(aa.direction))<mr?this.object.lookAt(this.target):(rn.setFromNormalAndCoplanarPoint(this.object.up,this.target),aa.intersectPlane(rn,this.target))))}else if(this.object.isOrthographicCamera){let i=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),i!==this.object.zoom&&(this.object.updateProjectionMatrix(),p=!0)}return this._scale=1,this._performCursorZoom=!1,p||this._lastPosition.distanceToSquared(this.object.position)>Oa||8*(1-this._lastQuaternion.dot(this.object.quaternion))>Oa||this._lastTargetPosition.distanceToSquared(this.target)>Oa?(this.dispatchEvent(nn),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(e){return e!==null?We/60*this.autoRotateSpeed*e:We/60/60*this.autoRotateSpeed}_getZoomScale(e){let s=Math.abs(e*.01);return Math.pow(.95,this.zoomSpeed*s)}_rotateLeft(e){this._sphericalDelta.theta-=e}_rotateUp(e){this._sphericalDelta.phi-=e}_panLeft(e,s){_e.setFromMatrixColumn(s,0),_e.multiplyScalar(-e),this._panOffset.add(_e)}_panUp(e,s){this.screenSpacePanning===!0?_e.setFromMatrixColumn(s,1):(_e.setFromMatrixColumn(s,0),_e.crossVectors(this.object.up,_e)),_e.multiplyScalar(e),this._panOffset.add(_e)}_pan(e,s){let r=this.domElement;if(this.object.isPerspectiveCamera){let u=this.object.position;_e.copy(u).sub(this.target);let p=_e.length();p*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*e*p/r.clientHeight,this.object.matrix),this._panUp(2*s*p/r.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(e*(this.object.right-this.object.left)/this.object.zoom/r.clientWidth,this.object.matrix),this._panUp(s*(this.object.top-this.object.bottom)/this.object.zoom/r.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(e,s){if(!this.zoomToCursor)return;this._performCursorZoom=!0;let r=this.domElement.getBoundingClientRect(),u=e-r.left,p=s-r.top,i=r.width,d=r.height;this._mouse.x=u/i*2-1,this._mouse.y=-(p/d)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(e){return Math.max(this.minDistance,Math.min(this.maxDistance,e))}_handleMouseDownRotate(e){this._rotateStart.set(e.clientX,e.clientY)}_handleMouseDownDolly(e){this._updateZoomParameters(e.clientX,e.clientY),this._dollyStart.set(e.clientX,e.clientY)}_handleMouseDownPan(e){this._panStart.set(e.clientX,e.clientY)}_handleMouseMoveRotate(e){this._rotateEnd.set(e.clientX,e.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let s=this.domElement;this._rotateLeft(We*this._rotateDelta.x/s.clientHeight),this._rotateUp(We*this._rotateDelta.y/s.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(e){this._dollyEnd.set(e.clientX,e.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.zoomToCursor&&(this._performCursorZoom=!0,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()),this.update()}_handleMouseMovePan(e){this._panEnd.set(e.clientX,e.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(e){this._updateZoomParameters(e.clientX,e.clientY),e.deltaY<0?this._dollyIn(this._getZoomScale(e.deltaY)):e.deltaY>0&&this._dollyOut(this._getZoomScale(e.deltaY)),this.update()}_handleKeyDown(e){let s=!1;switch(e.code){case this.keys.UP:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(We*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),s=!0;break;case this.keys.BOTTOM:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(-We*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),s=!0;break;case this.keys.LEFT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(We*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),s=!0;break;case this.keys.RIGHT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(-We*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),s=!0;break}s&&(e.preventDefault(),this.update())}_handleTouchStartRotate(e){if(this._pointers.length===1)this._rotateStart.set(e.pageX,e.pageY);else{let s=this._getSecondPointerPosition(e),r=.5*(e.pageX+s.x),u=.5*(e.pageY+s.y);this._rotateStart.set(r,u)}}_handleTouchStartPan(e){if(this._pointers.length===1)this._panStart.set(e.pageX,e.pageY);else{let s=this._getSecondPointerPosition(e),r=.5*(e.pageX+s.x),u=.5*(e.pageY+s.y);this._panStart.set(r,u)}}_handleTouchStartDolly(e){let s=this._getSecondPointerPosition(e),r=e.pageX-s.x,u=e.pageY-s.y,p=Math.sqrt(r*r+u*u);this._dollyStart.set(0,p)}_handleTouchStartDollyPan(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enablePan&&this._handleTouchStartPan(e)}_handleTouchStartDollyRotate(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enableRotate&&this._handleTouchStartRotate(e)}_handleTouchMoveRotate(e){if(this._pointers.length==1)this._rotateEnd.set(e.pageX,e.pageY);else{let r=this._getSecondPointerPosition(e),u=.5*(e.pageX+r.x),p=.5*(e.pageY+r.y);this._rotateEnd.set(u,p)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let s=this.domElement;this._rotateLeft(We*this._rotateDelta.x/s.clientHeight),this._rotateUp(We*this._rotateDelta.y/s.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(e){if(this._pointers.length===1)this._panEnd.set(e.pageX,e.pageY);else{let s=this._getSecondPointerPosition(e),r=.5*(e.pageX+s.x),u=.5*(e.pageY+s.y);this._panEnd.set(r,u)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(e){let s=this._getSecondPointerPosition(e),r=e.pageX-s.x,u=e.pageY-s.y,p=Math.sqrt(r*r+u*u);this._dollyEnd.set(0,p),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);let i=(e.pageX+s.x)*.5,d=(e.pageY+s.y)*.5;this._updateZoomParameters(i,d)}_handleTouchMoveDollyPan(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enablePan&&this._handleTouchMovePan(e)}_handleTouchMoveDollyRotate(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enableRotate&&this._handleTouchMoveRotate(e)}_addPointer(e){this._pointers.push(e.pointerId)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let s=0;s<this._pointers.length;s++)if(this._pointers[s]==e.pointerId){this._pointers.splice(s,1);return}}_isTrackingPointer(e){for(let s=0;s<this._pointers.length;s++)if(this._pointers[s]==e.pointerId)return!0;return!1}_trackPointer(e){let s=this._pointerPositions[e.pointerId];s===void 0&&(s=new q,this._pointerPositions[e.pointerId]=s),s.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){let s=e.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[s]}_customWheelEvent(e){let s=e.deltaMode,r={clientX:e.clientX,clientY:e.clientY,deltaY:e.deltaY};switch(s){case 1:r.deltaY*=16;break;case 2:r.deltaY*=100;break}return e.ctrlKey&&!this._controlActive&&(r.deltaY*=10),r}};function fr(a){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(a.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(a)&&(this._addPointer(a),a.pointerType==="touch"?this._onTouchStart(a):this._onMouseDown(a),this._cursorStyle==="grab"&&(this.domElement.style.cursor="grabbing")))}function dr(a){this.enabled!==!1&&(a.pointerType==="touch"?this._onTouchMove(a):this._onMouseMove(a))}function pr(a){switch(this._removePointer(a),this._pointers.length){case 0:this.domElement.releasePointerCapture(a.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(ln),this.state=re.NONE,this._cursorStyle==="grab"&&(this.domElement.style.cursor="grab");break;case 1:let e=this._pointers[0],s=this._pointerPositions[e];this._onTouchStart({pointerId:e,pageX:s.x,pageY:s.y});break}}function gr(a){let e;switch(a.button){case 0:e=this.mouseButtons.LEFT;break;case 1:e=this.mouseButtons.MIDDLE;break;case 2:e=this.mouseButtons.RIGHT;break;default:e=-1}switch(e){case It.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(a),this.state=re.DOLLY;break;case It.ROTATE:if(a.ctrlKey||a.metaKey||a.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(a),this.state=re.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(a),this.state=re.ROTATE}break;case It.PAN:if(a.ctrlKey||a.metaKey||a.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(a),this.state=re.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(a),this.state=re.PAN}break;default:this.state=re.NONE}this.state!==re.NONE&&this.dispatchEvent(Ga)}function vr(a){switch(this.state){case re.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(a);break;case re.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(a);break;case re.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(a);break}}function wr(a){this.enabled===!1||this.enableZoom===!1||this.state!==re.NONE||(a.preventDefault(),this.dispatchEvent(Ga),this._handleMouseWheel(this._customWheelEvent(a)),this.dispatchEvent(ln))}function yr(a){this.enabled!==!1&&this._handleKeyDown(a)}function br(a){switch(this._trackPointer(a),this._pointers.length){case 1:switch(this.touches.ONE){case Ot.ROTATE:if(this.enableRotate===!1){this.state=re.NONE;break}this._handleTouchStartRotate(a),this.state=re.TOUCH_ROTATE;break;case Ot.PAN:if(this.enablePan===!1){this.state=re.NONE;break}this._handleTouchStartPan(a),this.state=re.TOUCH_PAN;break;default:this.state=re.NONE}break;case 2:switch(this.touches.TWO){case Ot.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(a),this.state=re.TOUCH_DOLLY_PAN;break;case Ot.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(a),this.state=re.TOUCH_DOLLY_ROTATE;break;default:this.state=re.NONE}break;default:this.state=re.NONE}this.state!==re.NONE&&this.dispatchEvent(Ga)}function xr(a){switch(this._trackPointer(a),this.state){case re.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(a),this.update();break;case re.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(a),this.update();break;case re.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(a),this.update();break;case re.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(a),this.update();break;default:this.state=re.NONE}}function Er(a){this.enabled!==!1&&a.preventDefault()}function Tr(a){a.key==="Control"&&(this._controlActive=!0,this.domElement.ownerDocument.addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function Mr(a){a.key==="Control"&&(this._controlActive=!1,this.domElement.ownerDocument.removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}var na={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`};var cn={name:"LuminosityHighPassShader",uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new Ve(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			float v = luminance( texel.xyz );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`};var Vt=class a extends sn{constructor(e,s=1,r,u){super(),this.strength=s,this.radius=r,this.threshold=u,this.resolution=e!==void 0?new q(e.x,e.y):new q(256,256),this.clearColor=new Ve(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let p=Math.round(this.resolution.x/2),i=Math.round(this.resolution.y/2);this.renderTargetBright=new $t(p,i,{type:yt,depthBuffer:!1}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let m=0;m<this.nMips;m++){let v=new $t(p,i,{type:yt,depthBuffer:!1});v.texture.name="UnrealBloomPass.h"+m,v.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(v);let T=new $t(p,i,{type:yt,depthBuffer:!1});T.texture.name="UnrealBloomPass.v"+m,T.texture.generateMipmaps=!1,this.renderTargetsVertical.push(T),p=Math.round(p/2),i=Math.round(i/2)}let d=cn;this.highPassUniforms=Ua.clone(d.uniforms),this.highPassUniforms.luminosityThreshold.value=u,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new Se({uniforms:this.highPassUniforms,vertexShader:d.vertexShader,fragmentShader:d.fragmentShader}),this.separableBlurMaterials=[];let o=[6,10,14,18,22];p=Math.round(this.resolution.x/2),i=Math.round(this.resolution.y/2);for(let m=0;m<this.nMips;m++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(o[m])),this.separableBlurMaterials[m].uniforms.invSize.value=new q(1/p,1/i),p=Math.round(p/2),i=Math.round(i/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=s,this.compositeMaterial.uniforms.bloomRadius.value=.1;let y=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=y,this.bloomTintColors=[new g(1,1,1),new g(1,1,1),new g(1,1,1),new g(1,1,1),new g(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=Ua.clone(na.uniforms),this.blendMaterial=new Se({uniforms:this.copyUniforms,vertexShader:na.vertexShader,fragmentShader:na.fragmentShader,premultipliedAlpha:!0,blending:Fs,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new Ve,this._oldClearAlpha=1,this._basic=new $o,this._fsQuad=new oa(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(e,s){let r=Math.round(e/2),u=Math.round(s/2);this.renderTargetBright.setSize(r,u);for(let p=0;p<this.nMips;p++)this.renderTargetsHorizontal[p].setSize(r,u),this.renderTargetsVertical[p].setSize(r,u),this.separableBlurMaterials[p].uniforms.invSize.value=new q(1/r,1/u),r=Math.round(r/2),u=Math.round(u/2)}render(e,s,r,u,p){e.getClearColor(this._oldClearColor),this._oldClearAlpha=e.getClearAlpha();let i=e.autoClear;e.autoClear=!1,e.setClearColor(this.clearColor,0),p&&e.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=r.texture,e.setRenderTarget(null),e.clear(),this._fsQuad.render(e)),this.highPassUniforms.tDiffuse.value=r.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,e.setRenderTarget(this.renderTargetBright),e.clear(),this._fsQuad.render(e);let d=this.renderTargetBright;for(let o=0;o<this.nMips;o++)this._fsQuad.material=this.separableBlurMaterials[o],this.separableBlurMaterials[o].uniforms.colorTexture.value=d.texture,this.separableBlurMaterials[o].uniforms.direction.value=a.BlurDirectionX,e.setRenderTarget(this.renderTargetsHorizontal[o]),e.clear(),this._fsQuad.render(e),this.separableBlurMaterials[o].uniforms.colorTexture.value=this.renderTargetsHorizontal[o].texture,this.separableBlurMaterials[o].uniforms.direction.value=a.BlurDirectionY,e.setRenderTarget(this.renderTargetsVertical[o]),e.clear(),this._fsQuad.render(e),d=this.renderTargetsVertical[o];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,e.setRenderTarget(this.renderTargetsHorizontal[0]),e.clear(),this._fsQuad.render(e),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,p&&e.state.buffers.stencil.setTest(!0),this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(r),this._fsQuad.render(e)),e.setClearColor(this._oldClearColor,this._oldClearAlpha),e.autoClear=i}_getSeparableBlurMaterial(e){let s=[],r=e/3;for(let i=0;i<e;i++)s.push(.39894*Math.exp(-.5*i*i/(r*r))/r);let u=[],p=[];for(let i=1;i<e;i+=2){let d=s[i],o=i+1<e?s[i+1]:0,y=d+o;u.push((i*d+(i+1)*o)/y),p.push(y)}return new Se({defines:{KERNEL_PAIRS:u.length},uniforms:{colorTexture:{value:null},invSize:{value:new q(.5,.5)},direction:{value:new q(.5,.5)},centerWeight:{value:s[0]},gaussianOffsets:{value:u},gaussianWeights:{value:p}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				#include <common>

				varying vec2 vUv;

				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float centerWeight;
				uniform float gaussianOffsets[KERNEL_PAIRS];
				uniform float gaussianWeights[KERNEL_PAIRS];

				void main() {

					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * centerWeight;

					for ( int i = 0; i < KERNEL_PAIRS; i ++ ) {

						vec2 uvOffset = direction * invSize * gaussianOffsets[ i ];
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += ( sample1 + sample2 ) * gaussianWeights[ i ];

					}

					gl_FragColor = vec4( diffuseSum, 1.0 );

				}`})}_getCompositeMaterial(e){return new Se({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				varying vec2 vUv;

				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor( const in float factor ) {

					float mirrorFactor = 1.2 - factor;
					return mix( factor, mirrorFactor, bloomRadius );

				}

				void main() {

					// 3.0 for backwards compatibility with previous alpha-based intensity
					vec3 bloom = 3.0 * bloomStrength * (
						lerpBloomFactor( bloomFactors[ 0 ] ) * bloomTintColors[ 0 ] * texture2D( blurTexture1, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 1 ] ) * bloomTintColors[ 1 ] * texture2D( blurTexture2, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 2 ] ) * bloomTintColors[ 2 ] * texture2D( blurTexture3, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 3 ] ) * bloomTintColors[ 3 ] * texture2D( blurTexture4, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 4 ] ) * bloomTintColors[ 4 ] * texture2D( blurTexture5, vUv ).rgb
					);

					float bloomAlpha = max( bloom.r, max( bloom.g, bloom.b ) );
					gl_FragColor = vec4( bloom, bloomAlpha );

				}`})}};Vt.BlurDirectionX=new q(1,0);Vt.BlurDirectionY=new q(0,1);var bo="varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",Na=`
uniform float uNear; uniform float uFar;
float linZ(float d) { float z = d * 2.0 - 1.0; return (2.0 * uNear * uFar) / (uFar + uNear - z * (uFar - uNear)); }`,Et={STATIC:0,REGION:2};function hn({renderer:a,camera:e,Q:s,smokeScene:r,SU:u,setMode:p}){let i=new oa(null),d=[],o=(x,G,Q)=>{let se=new $t(x,G,Q);return d.push(se),se},y=x=>(x.depthTexture=new Ws(x.width,x.height),x.depthTexture.type=Bs,x),m={type:yt},v=y(o(16,16,{...m,samples:s.msaa})),T=y(o(16,16,{...m})),V=o(16,16,{...m,depthBuffer:!1}),M=o(16,16,{...m,depthBuffer:!1}),L=o(16,16,{...m,depthBuffer:!1}),C=o(16,16,{...m,depthBuffer:!1}),U=o(16,16,{...m,depthBuffer:!1}),B=o(16,16,{...m,format:Us,depthBuffer:!1,minFilter:Da,magFilter:Da}),k=o(16,16,{depthBuffer:!1}),l=new Se({uniforms:{tColor:{value:null},tDepth:{value:null}},vertexShader:bo,fragmentShader:"uniform sampler2D tColor; uniform sampler2D tDepth; varying vec2 vUv; void main() { gl_FragColor = texture2D(tColor, vUv); gl_FragDepth = texture2D(tDepth, vUv).r; }",depthTest:!0,depthWrite:!0,depthFunc:ka}),S=new Se({uniforms:{tStat:{value:T.texture},tEmb:{value:V.texture},tDepth:{value:T.depthTexture},uI:{value:1}},vertexShader:bo,fragmentShader:"uniform sampler2D tStat; uniform sampler2D tEmb; uniform sampler2D tDepth; uniform float uI; varying vec2 vUv; void main() { gl_FragColor = vec4(texture2D(tStat, vUv).rgb + uI * texture2D(tEmb, vUv).rgb, 1.0); gl_FragDepth = texture2D(tDepth, vUv).r; }",depthTest:!0,depthWrite:!0,depthFunc:ka}),E=new Se({uniforms:{tColor:{value:null},tDepth:{value:null},uFocus:{value:200},uEq:{value:600},uK:{value:1},uNear:{value:e.near},uFar:{value:e.far},uTexel:{value:new q},uMax:{value:8}},vertexShader:bo,fragmentShader:`uniform sampler2D tColor; uniform sampler2D tDepth; uniform float uFocus; uniform float uEq; uniform float uK; uniform vec2 uTexel; uniform float uMax; varying vec2 vUv;
      ${Na}
      float coc(vec2 uv) { float d = linZ(texture2D(tDepth, uv).r) - uFocus; return min(uK * abs(d) / max(uEq + d, 1.0), uMax); }
      void main() {
        float c0 = coc(vUv);
        vec3 acc = texture2D(tColor, vUv).rgb; float wsum = 1.0;
        float rot = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) * 6.2831853;
        float reach = max(c0, uMax * 0.5);
        for (int i = 1; i < 32; i++) {
          float r = sqrt(float(i) / 32.0) * reach;
          float a = float(i) * 2.39996 + rot;
          vec2 uv = vUv + vec2(cos(a), sin(a)) * r * uTexel;
          float ci = coc(uv);
          float w = smoothstep(r - 1.0, r + 1.0, max(ci, c0 * 0.6)) * step(r, max(ci, c0) + 1.0);
          acc += texture2D(tColor, uv).rgb * w; wsum += w;
        }
        gl_FragColor = vec4(acc / wsum, 1.0);
      }`,depthTest:!1,depthWrite:!1}),R=new Se({uniforms:{tDepth:{value:null},uNear:{value:e.near},uFar:{value:e.far}},vertexShader:bo,fragmentShader:`uniform sampler2D tDepth; varying vec2 vUv; ${Na} void main() { gl_FragColor = vec4(linZ(texture2D(tDepth, vUv).r), 0.0, 0.0, 1.0); }`,depthTest:!1,depthWrite:!1}),f=s.bloomReal?new Vt(new q(16,16),.5,.3,3.2):null;if(f){let x=f.materialHighPassFilter;x.uniforms.tSmoke={value:U.texture},x.fragmentShader=x.fragmentShader.replace("uniform sampler2D tDiffuse;",`uniform sampler2D tDiffuse;
uniform sampler2D tSmoke;`).replace("vec4 texel = texture2D( tDiffuse, vUv );",`vec4 texel = texture2D( tDiffuse, vUv );
			float bloomMask = clamp( texel.a - 1.0, 0.0, 1.0 );
			{ vec4 s = texture2D( tSmoke, vUv ); texel.rgb = texel.rgb * ( 1.0 - s.a ) + s.rgb; }`),x.fragmentShader=x.fragmentShader.replace("float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );","float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v ) * bloomMask;"),x.needsUpdate=!0}let P=new Se({uniforms:{tScene:{value:v.texture},tDepth:{value:v.depthTexture},tDofStat:{value:M.texture},tDofEmb:{value:L.texture},tDofLive:{value:C.texture},uDofK:{value:0},uBox:{value:new bt(2,2,-1,-1)},uI:{value:1},tSmoke:{value:U.texture},tSmokeZ:{value:B.texture},uSmokeSize:{value:new q(1,1)},tBloom:{value:f?f.renderTargetsHorizontal[0].texture:null},uBloom:{value:f?1:0},uGlowPos:{value:new q},uGlowCol:{value:new g},uGlowR:{value:.05},uFGlowPos:{value:new q},uFGlowCol:{value:new g},uFGlowR:{value:.05},uShim:{value:new bt(0,0,0,.1)},uT:{value:0},uAspect:{value:1},uNear:{value:e.near},uFar:{value:e.far},seed:{value:0},toneMappingExposure:{value:1}},vertexShader:bo,fragmentShader:`
      uniform sampler2D tScene; uniform sampler2D tDepth;
      uniform sampler2D tDofStat; uniform sampler2D tDofEmb; uniform sampler2D tDofLive; uniform float uDofK; uniform vec4 uBox; uniform float uI;
      uniform sampler2D tSmoke; uniform sampler2D tSmokeZ; uniform vec2 uSmokeSize;
      uniform sampler2D tBloom; uniform float uBloom;
      uniform vec2 uGlowPos; uniform vec3 uGlowCol; uniform float uGlowR; uniform float uAspect;
      uniform vec2 uFGlowPos; uniform vec3 uFGlowCol; uniform float uFGlowR;
      uniform vec4 uShim; uniform float uT;
      uniform float seed;
      varying vec2 vUv;
      ${Na}
      #include <tonemapping_pars_fragment>
      // the smoke, upsampled: of the four texels around this pixel, those at this pixel's depth
      // (no halo of smoke from behind the cigarette over its edge, nor the other way round)
      vec4 smokeAt(vec2 uv) {
        vec2 st = uv * uSmokeSize - 0.5;
        vec2 f = fract(st);
        vec2 b = (floor(st) + 0.5) / uSmokeSize;
        vec2 o = 1.0 / uSmokeSize;
        float z = linZ(texture2D(tDepth, uv).r);
        vec4 acc = vec4(0.0); float wsum = 0.0;
        float best = 1e9; vec4 nearest = vec4(0.0);
        for (int k = 0; k < 4; k++) {
          vec2 q = vec2(float(k - (k / 2) * 2), float(k / 2));
          vec2 tuv = b + q * o;
          float zi = texture2D(tSmokeZ, tuv).r;
          vec4 si = texture2D(tSmoke, tuv);
          float wb = mix(1.0 - f.x, f.x, q.x) * mix(1.0 - f.y, f.y, q.y);
          float dz = abs(zi - z);
          float w = wb / (1.0 + dz * dz / max(0.0004 * z * z, 1e-4));
          acc += si * w; wsum += w;
          if (dz < best) { best = dz; nearest = si; }
        }
        // (all four agree: plain bilinear; across an edge: the nearest in depth)
        return best < 0.02 * z ? acc / max(wsum, 1e-5) : nearest;
      }
      void main() {
        vec2 suv = vUv;
        if (uShim.z > 0.0) {
          // heat shimmer over the flame (high tier): the picture above it refracted by rising air,
          // a column that wavers, strongest just above the tip, gone a few centimetres higher
          vec2 q = (vUv - uShim.xy) * vec2(uAspect, 1.0) / uShim.w;
          float m = exp(-q.x * q.x * 3.0) * smoothstep(-0.25, 0.25, q.y) * exp(-max(q.y, 0.0) * 1.1);
          vec2 w = vec2(sin(q.y * 11.0 - uT * 13.0 + sin(q.x * 7.0 + uT * 3.0) * 1.5), cos(q.y * 8.0 - uT * 10.0 + q.x * 4.0));
          suv += w * m * uShim.z * uShim.w * 0.045 * vec2(1.0 / uAspect, 1.0);
        }
        vec3 c = texture2D(tScene, suv).rgb;
        if (uDofK > 0.0) {
          bool inBox = vUv.x >= uBox.x && vUv.y >= uBox.y && vUv.x <= uBox.z && vUv.y <= uBox.w;
          vec3 d = inBox ? texture2D(tDofLive, vUv).rgb : texture2D(tDofStat, vUv).rgb + uI * texture2D(tDofEmb, vUv).rgb;
          c = mix(c, d, uDofK);
        }
        vec4 s = smokeAt(vUv);
        c = c * (1.0 - s.a) + s.rgb;
        if (uBloom > 0.5) c += texture2D(tBloom, vUv).rgb;
        else {
          // (lower tiers: the ember's glow as a soft disc on the screen, scaled by its intensity)
          vec2 g = (vUv - uGlowPos) * vec2(uAspect, 1.0);
          float r = length(g) / uGlowR;
          c += uGlowCol * (exp(-r * r * 3.0) * 0.7 + exp(-r * 1.6) * 0.3);
          // (and the lighter's flame's, while it burns)
          vec2 fg = (vUv - uFGlowPos) * vec2(uAspect, 1.0);
          float fr = length(fg) / uFGlowR;
          c += uFGlowCol * (exp(-fr * fr * 3.0) * 0.6 + exp(-fr * 1.4) * 0.4);
        }
        { vec2 dv = (vUv - 0.5) * vec2(1.0, 0.8); c *= mix(0.62, 1.0, smoothstep(0.85, 0.2, length(dv))); }
        c = ACESFilmicToneMapping(c);
        vec4 o = sRGBTransferOETF(vec4(c, 1.0));
        float n = fract(sin(dot(gl_FragCoord.xy + seed * 37.0, vec2(12.9898, 78.233))) * 43758.5453);
        float l = dot(o.rgb, vec3(0.33));
        o.rgb += (n - 0.5) * (0.004 + 0.03 * l * (1.0 - l));
        gl_FragColor = o;
      }`,depthTest:!1,depthWrite:!1,toneMapped:!1}),Z=null,X=!1,n=!1;import("./ember-SMAAPass-77GKFMCT.js").then(({SMAAPass:x})=>{n||(Z=new x,Z.setSize(pe,O),X=!0)});let pe=16,O=16,j=16,J=16;function D(x,G){pe=x,O=G,j=Math.max(1,Math.round(x*s.smokeScale)),J=Math.max(1,Math.round(G*s.smokeScale));for(let Q of[v,T,V,M,L,C,k])Q.setSize(x,G);U.setSize(j,J),B.setSize(j,J),P.uniforms.uSmokeSize.value.set(j,J),P.uniforms.uAspect.value=x/G,E.uniforms.uTexel.value.set(1/x,1/G),E.uniforms.uMax.value=12*(G/1080),u.uRes.value.set(j,J),u.uPx.value=J/(2*Math.tan(le.degToRad(e.fov/2))),f&&f.setSize(Math.round(x*s.bloomScale*2),Math.round(G*s.bloomScale*2)),Z?.setSize(x,G),he="",ze="",ve.valid=!1}function $(x,G,Q){i.material=x,G&&(G.scissorTest=!!Q,Q&&G.scissor.copy(Q)),a.setRenderTarget(G),i.render(a),G&&(G.scissorTest=!1)}let I=new bt;function N(x,G,Q,se,Le){let W=Math.max(0,Math.floor(x.x*G-se)),de=Math.max(0,Math.floor(x.y*Q-se)),Ge=Math.min(G,Math.ceil(x.z*G+se)),A=Math.min(Q,Math.ceil(x.w*Q+se));return Le.set(W,de,Math.max(0,Ge-W),Math.max(0,A-de))}function H(x){let G=E.uniforms,Q=2*x.s*Math.tan(le.degToRad(e.fov/2));G.uFocus.value=x.s,G.uEq.value=100+Q*100/24;let se=2.8*Math.max(1,(x.home/x.s)**2);G.uK.value=.5*(100/se)*O/Q}let te=new bt,he="",oe=[6,10,14,18,22];function Oe(x){let G=x?`${x.x.toFixed(3)},${x.y.toFixed(3)},${x.z.toFixed(3)},${x.w.toFixed(3)}`:"all",Q=[f.renderTargetBright,...f.renderTargetsHorizontal,...f.renderTargetsVertical];if(a.setClearColor(0,0),G!==he){for(let ue of Q)ue.scissorTest=!1,a.setRenderTarget(ue),a.clear(!0,!1,!1);he=G}let se=(ue,Me)=>{if(!x){ue.scissorTest=!1;return}N(x,ue.width,ue.height,Me,te),ue.scissor.copy(te),ue.scissorTest=!0},Le=f.highPassUniforms;Le.tDiffuse.value=v.texture,Le.luminosityThreshold.value=f.threshold,i.material=f.materialHighPassFilter,se(f.renderTargetBright,2),a.setRenderTarget(f.renderTargetBright),a.clear(!0,!1,!1),i.render(a);let W=f.renderTargetBright,de=2;for(let ue=0;ue<f.nMips;ue++){let Me=f.separableBlurMaterials[ue],Ie=f.renderTargetsHorizontal[ue];de+=oe[ue]*(pe/Ie.width);let Ne=de*(Ie.width/pe)+2;i.material=Me,Me.uniforms.colorTexture.value=W.texture,Me.uniforms.direction.value=Vt.BlurDirectionX,se(Ie,Ne),a.setRenderTarget(Ie),a.clear(!0,!1,!1),i.render(a),Me.uniforms.colorTexture.value=Ie.texture,Me.uniforms.direction.value=Vt.BlurDirectionY;let tt=f.renderTargetsVertical[ue];se(tt,Ne),a.setRenderTarget(tt),a.clear(!0,!1,!1),i.render(a),W=tt}let Ge=f.compositeMaterial;Ge.uniforms.bloomStrength.value=f.strength,Ge.uniforms.bloomRadius.value=f.radius,Ge.uniforms.bloomTintColors.value=f.bloomTintColors,i.material=Ge;let A=f.renderTargetsHorizontal[0];se(A,de*(A.width/pe)+2),a.setRenderTarget(A),a.clear(!0,!1,!1),i.render(a);for(let ue of Q)ue.scissorTest=!1}let fe=new bt,ze="";function De(x){let G=x?`${x.x.toFixed(3)},${x.y.toFixed(3)},${x.z.toFixed(3)},${x.w.toFixed(3)}`:"all";if(a.setClearColor(0,0),G!==ze){for(let se of[U,B])se.scissorTest=!1,a.setRenderTarget(se),a.clear(!0,!1,!1);ze=G}let Q=x?N(x,j,J,2,fe):null;R.uniforms.tDepth.value=v.depthTexture,$(R,B,Q),u.uDepthZ.value=B.texture,U.scissorTest=!!Q,Q&&U.scissor.copy(Q),a.setRenderTarget(U),a.clear(!0,!1,!1),a.render(r,e),U.scissorTest=!1,a.setClearColor(0,1)}let ve={valid:!1,targets:d,debugTargets:{live:v,cStat:T,cEmb:V,dStat:M,dEmb:L,dLive:C,smoke:U,smokeZ:B},live:v,setSize:D,bake(x,G,Q){let se=e.layers.mask;a.setClearColor(0,1),Q&&(e.layers.enable(Et.STATIC),e.layers.enable(Et.REGION),p("full"),a.shadowMap.needsUpdate=!0,a.setRenderTarget(v),a.clear(),a.render(x,e)),e.layers.set(Et.STATIC),p("static"),a.setRenderTarget(v),a.clear(),a.render(x,e),l.uniforms.tColor.value=v.texture,l.uniforms.tDepth.value=v.depthTexture,a.setRenderTarget(T),a.clear(),$(l,T),p("ember"),a.setRenderTarget(v),a.clear(),a.render(x,e),i.material=l,l.uniforms.tColor.value=v.texture,a.setRenderTarget(V),i.render(a),p("full"),e.layers.mask=se,s.dof&&(H(G),E.uniforms.tDepth.value=T.depthTexture,E.uniforms.tColor.value=T.texture,$(E,M),E.uniforms.tColor.value=V.texture,$(E,L)),ve.valid=!0},render(x){let G=x.scene;a.setClearColor(0,1);let Q=e.layers.mask;if(x.still&&!x.truth){S.uniforms.uI.value=x.emberI,$(S,v);let W=a.autoClear;a.autoClear=!1,e.layers.set(Et.REGION),p("region"),a.setRenderTarget(v),a.render(G,e),p("full"),a.autoClear=W,e.layers.mask=Q}else e.layers.enable(Et.STATIC),e.layers.enable(Et.REGION),a.setRenderTarget(v),a.clear(),a.render(G,e),e.layers.mask=Q;let se=s.dof&&x.still?x.dofK:0;P.uniforms.uDofK.value=se,se>0&&(H(x.focus),E.uniforms.tColor.value=v.texture,E.uniforms.tDepth.value=v.depthTexture,x.truth?I.set(0,0,pe,O):N(x.regionBox,pe,O,E.uniforms.uMax.value+2,I),$(E,C,I),P.uniforms.uBox.value.set(I.x/pe,I.y/O,(I.x+I.z)/pe,(I.y+I.w)/O),P.uniforms.uI.value=x.emberI),De(x.still&&!x.truth?x.smokeBox:null);let Le=f&&s.bloomReal;if(P.uniforms.uBloom.value=Le?1:0,Le)Oe(x.still&&!x.truth?x.emberBox:null);else{P.uniforms.uGlowPos.value.set(x.glow.x,x.glow.y),P.uniforms.uGlowR.value=x.glow.r,P.uniforms.uGlowCol.value.copy(x.glow.col);let W=x.flameGlow;P.uniforms.uFGlowPos.value.set(W?W.x:0,W?W.y:0),P.uniforms.uFGlowR.value=W?W.r:.05,W?P.uniforms.uFGlowCol.value.copy(W.col):P.uniforms.uFGlowCol.value.set(0,0,0)}x.shim?P.uniforms.uShim.value.set(x.shim.x,x.shim.y,x.shim.k,x.shim.r):P.uniforms.uShim.value.z=0,P.uniforms.uT.value=x.time||0,P.uniforms.seed.value=x.seed,P.uniforms.toneMappingExposure.value=a.toneMappingExposure,!x.still&&s.smaa&&Z&&!X?($(P,k),Z.renderToScreen=!0,Z.render(a,null,k)):$(P,null),X&&x.still&&(Z.renderToScreen=!1,Z.render(a,C,k),X=!1)},dispose(){for(let x of d)x.dispose();for(let x of[l,S,E,R,P])x.dispose();i.dispose(),f?.dispose(),Z?.dispose(),n=!0}};return ve}var it={uEmberPosV:{value:new g},uEmberCol:{value:new Ve(0,0,0)},uEmberI:{value:0},uEmberCut:{value:140},uFlamePosV:{value:new g},uFlameCol:{value:new Ve(0,0,0)},uFlameI:{value:0},uFlameCut:{value:420},uFlameFootV:{value:new g},uFlameShade:{value:0},uFlameSplit:{value:0},uFlameCone:{value:new q(0,1)},uFlameDownV:{value:new g(0,-1,0)}};function mn(){xt.lights_pars_begin.includes("uEmberPosV")||(xt.lights_pars_begin+=`
uniform vec3 uEmberPosV;
uniform vec3 uEmberCol;
uniform float uEmberI;
uniform float uEmberCut;
uniform vec3 uFlamePosV;
uniform vec3 uFlameCol;
uniform float uFlameI;
uniform float uFlameCut;
uniform vec3 uFlameFootV;
uniform float uFlameShade;
uniform float uFlameSplit;
uniform vec2 uFlameCone;
uniform vec3 uFlameDownV;
`,xt.lights_fragment_end+=`
#if defined( RE_Direct )
	if ( uEmberI > 0.0 ) {
		vec3 emberV = uEmberPosV - geometryPosition;
		float emberD = length( emberV );
		directLight.direction = emberV / max( emberD, 1e-4 );
		directLight.color = uEmberCol * getDistanceAttenuation( emberD, uEmberCut, 2.0 );
		directLight.visible = true;
		ReflectedLight emberRL = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
		#ifdef USE_CLEARCOAT
			vec3 emberCC = clearcoatSpecularDirect;
			clearcoatSpecularDirect = vec3( 0.0 );
		#endif
		#ifdef USE_SHEEN
			vec3 emberSh = sheenSpecularDirect;
			sheenSpecularDirect = vec3( 0.0 );
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, emberRL );
		reflectedLight.directDiffuse += emberRL.directDiffuse * uEmberI;
		reflectedLight.directSpecular += min( emberRL.directSpecular, vec3( 1.6 ) ) * uEmberI;
		#ifdef USE_CLEARCOAT
			clearcoatSpecularDirect = emberCC + min( clearcoatSpecularDirect, vec3( 1.6 ) ) * uEmberI;
		#endif
		#ifdef USE_SHEEN
			sheenSpecularDirect = emberSh + sheenSpecularDirect * uEmberI;
		#endif
	}
	if ( uFlameI > 0.0 ) {
		vec3 flameV = uFlamePosV - geometryPosition;
		float flameD = length( flameV );
		directLight.direction = flameV / max( flameD, 1e-4 );
		directLight.color = uFlameCol * uFlameI * getDistanceAttenuation( flameD, uFlameCut, 2.0 );
		// (the lighter's own body shades what is right under it)
		vec3 fq = geometryPosition - uFlameFootV;
		directLight.color *= 1.0 - uFlameShade * 0.8 * ( 1.0 - smoothstep( 6.0, 26.0, length( fq ) ) );
		// (high tier: what the shadowed spot below the flame lights, it lights; this term the rest,
		// by the same cone, so the two always add up to the one flame)
		directLight.color *= 1.0 - uFlameSplit * smoothstep( uFlameCone.x, uFlameCone.y, dot( -directLight.direction, uFlameDownV ) );
		directLight.visible = true;
		ReflectedLight flameRL = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, flameRL );
		reflectedLight.directDiffuse += flameRL.directDiffuse;
		reflectedLight.directSpecular += min( flameRL.directSpecular, vec3( 1.8 ) );
	}
#endif
`)}function qa(a){let e=a.customProgramCacheKey(),s=a.onBeforeCompile;return a.onBeforeCompile=function(r,u){Object.assign(r.uniforms,it),s&&s.call(this,r,u)},a.customProgramCacheKey=()=>e,a}var Rr=new Ve(16738852),Sr=new g,fn=new Ve(16754253),un=new g,xo=fn;function ja(a,e,s,r,u,p,i){it.uFlamePosV.value.copy(un.copy(a).applyMatrix4(s.matrixWorldInverse)),it.uFlameFootV.value.copy(un.copy(e).applyMatrix4(s.matrixWorldInverse)),it.uFlameCol.value.copy(fn).multiplyScalar(u),it.uFlameI.value=r,it.uFlameShade.value=p,it.uFlameSplit.value=i?1:0,i&&(it.uFlameCone.value.set(Math.cos(i.angle),Math.cos(i.angle*(1-i.penumbra))),it.uFlameDownV.value.set(0,-1,0).transformDirection(s.matrixWorldInverse),i.position.copy(a),i.target.position.copy(a).y-=100,i.target.updateMatrixWorld(),i.intensity=u*r)}function Ya(a,e,s,r=180){it.uEmberPosV.value.copy(Sr.copy(a).applyMatrix4(e.matrixWorldInverse)),it.uEmberCol.value.copy(Rr).multiplyScalar(r),it.uEmberI.value=s}var dn=5;function pn({canvas:a,camera:e,controls:s,listen:r,onActive:u}){let p=[],i=new ta;i.layers.set(dn);let d=new q,o=[],y=null,m=null,v=null,T=null,V=null,M=new Map;function L(l,S){let E=a.getBoundingClientRect();return d.set((l-E.left)/E.width*2-1,-((S-E.top)/E.height)*2+1),i.setFromCamera(d,e),i.ray}function C(l,S){L(l,S),o.length=0;for(let f of p)f.canGrab()&&i.intersectObjects(f.meshes,!1,o);if(!o.length)return null;o.sort((f,P)=>f.distance-P.distance);let E=o[0],R=p.find(f=>f.meshes.includes(E.object));return R?{item:R,point:E.point.clone(),object:E.object}:null}function U(l){y=l.hit.item,m=l,s.enabled=!1,a.style.cursor="grabbing";try{a.setPointerCapture(l.id)}catch{}y.pick(l.hit,L(l.x,l.y)),navigator.vibrate?.(8)}function B(l){if(!y)return;let S=y;y=m=null,s.enabled=!0,a.style.cursor="",l==="home"?S.home():S.release()}r(a,"pointerdown",l=>{if(u(),l.pointerType==="touch"&&M.set(l.pointerId,{x:l.clientX,y:l.clientY}),y)return;if(l.pointerType==="touch"&&M.size>1){v&&clearTimeout(v.timer),v=null;return}if(l.button>0)return;let S=C(l.clientX,l.clientY);S&&(v={id:l.pointerId,x:l.clientX,y:l.clientY,t:performance.now(),stamp:l.timeStamp,hit:S,touch:l.pointerType==="touch",timer:0,moved:!1},v.touch?v.timer=setTimeout(()=>{if(v&&!y){let E=v;v=null,U(E)}},150):(l.stopImmediatePropagation(),v.timer=setTimeout(()=>{if(v&&!y){let E=v;v=null,U(E)}},200)))},{capture:!0}),r(window,"pointermove",l=>{if(l.pointerType==="touch"&&M.has(l.pointerId)&&(M.set(l.pointerId,{x:l.clientX,y:l.clientY}),y&&M.size===2)){let[S,E]=[...M.values()],R=Math.atan2(E.y-S.y,E.x-S.x);if(V!==null){let f=R-V;f>Math.PI&&(f-=2*Math.PI),f<-Math.PI&&(f+=2*Math.PI),y.twist(-f)}V=R;return}if(v&&l.pointerId===v.id&&Math.hypot(l.clientX-v.x,l.clientY-v.y)>6){clearTimeout(v.timer);let S=v;v=null,S.moved=!0,S.touch||U(S)}if(y){if(m&&l.pointerId!==m.id)return;u(),y.aim(L(l.clientX,l.clientY));return}l.pointerType==="mouse"&&!l.buttons&&l.target===a&&(T={x:l.clientX,y:l.clientY})});let k=l=>{M.delete(l.pointerId),M.size<2&&(V=null);let S=E=>E.touch?150:200;if(v&&l.pointerId===v.id){clearTimeout(v.timer);let E=v;v=null,l.type==="pointerup"&&l.timeStamp-E.stamp<S(E)&&E.hit.item.onTap(E.hit);return}if(y&&m&&l.pointerId===m.id&&l.type==="pointerup"&&!m.moved&&l.timeStamp-m.stamp<S(m)){let E=y,R=m;y=m=null,s.enabled=!0,a.style.cursor="",E.cancel(),E.onTap(R.hit);return}y&&(m&&m.touch?M.size===0&&B("release"):(!m||l.pointerId===m.id)&&B("release"))};return r(window,"pointerup",k),r(window,"pointercancel",k),r(a,"wheel",l=>{y&&(l.preventDefault(),l.stopImmediatePropagation(),y.twist(Math.sign(l.deltaY)*.18))},{passive:!1,capture:!0}),r(window,"keydown",l=>{l.key==="Escape"&&y&&B("home")}),{add(l){p.push(l);for(let S of l.meshes)S.layers.enable(dn)},get held(){return y},drop(l="release"){v&&clearTimeout(v.timer),v=null,B(l)},hover(){if(!T||y||v)return;let l=C(T.x,T.y);a.style.cursor=l?"grab":"",T=null},dispose(){v&&clearTimeout(v.timer)}}}function vn({length:a,radius:e,massA:s,massB:r,samples:u=9,sdf:p,floorY:i=0}){let d=new Float64Array(3),o=new Float64Array(3),y=new Float64Array(3),m=new Float64Array(3),v=new Float64Array(3),T=new Float64Array(3),V=1/s,M=1/r,L=new Float64Array(3),C=new Float64Array(3),U={A:d,B:o,awake:!1,roll:0,restFor:0,contact:!1,drop(k,l,S,E){d.set(k),o.set(l),v.set(S),T.set(E),U.awake=!0,U.restFor=0},step(k){if(!U.awake)return!1;let l=Math.max(2,Math.ceil(k/.004)),S=k/l;for(let R=0;R<l;R++)B(S);let E=Math.hypot(v[0],v[1],v[2])+Math.hypot(T[0],T[1],T[2]);return U.restFor=E<6&&U.contact?U.restFor+k:0,U.restFor>.4&&(U.awake=!1,v.fill(0),T.fill(0)),!0}};function B(k){for(let l=0;l<3;l++)y[l]=d[l],m[l]=o[l];v[1]+=-9810*k,T[1]+=-9810*k;for(let l=0;l<3;l++)d[l]+=v[l]*k,o[l]+=T[l]*k;U.contact=!1;for(let l=0;l<2;l++){let S=o[0]-d[0],E=o[1]-d[1],R=o[2]-d[2],f=Math.hypot(S,E,R)||1,P=(f-a)/f/(V+M);d[0]+=S*P*V,d[1]+=E*P*V,d[2]+=R*P*V,o[0]-=S*P*M,o[1]-=E*P*M,o[2]-=R*P*M;for(let Z=0;Z<u;Z++){let X=Z/(u-1);for(let te=0;te<3;te++)C[te]=d[te]+(o[te]-d[te])*X;let n=p(C[0],C[1],C[2],L)-e,pe=L[0],O=L[1],j=L[2],J=C[1]-i-e;if(J<n&&(n=J,pe=0,O=1,j=0),n>=0)continue;U.contact=!0;let D=(1-X)*V,$=X*M,I=(1-X)*D+X*$||1,N=-n*D/I,H=-n*$/I;d[0]+=pe*N,d[1]+=O*N,d[2]+=j*N,o[0]+=pe*H,o[1]+=O*H,o[2]+=j*H}}for(let l=0;l<3;l++)v[l]=(d[l]-y[l])/k,T[l]=(o[l]-m[l])/k;if(gn(v),gn(T),U.contact){let l=Math.exp(-k*22);for(let P=0;P<3;P++)P!==1&&(v[P]*=l,T[P]*=l);let S=o[0]-d[0],E=o[2]-d[2],R=Math.hypot(S,E)||1,f=((v[0]+T[0])*.5*-E+(v[2]+T[2])*.5*S)/R;U.roll+=f*k/e}}return U}function gn(a){let e=Math.hypot(a[0],a[1],a[2]);if(e>1500){let s=1500/e;a[0]*=s,a[1]*=s,a[2]*=s}}var eo=84,Za=4.1;function wn({camera:a,sdfGrad:e,notchPose:s,notchSeat:r,cigLength:u,onBreak:p,onChange:i}){let d=vn({length:eo,radius:Za,massA:1.35,massB:.65,sdf:e}),o={mode:"rest",c:null,xg:40,P:new g,V:new g,T:new g,off:new g,offSet:!1,accF:new g,holdY:0,baseY:0,lift:0,yaw:0,pitch:0,dYaw:0,dPitch:0,vYaw:0,vPitch:0,roll:0,acc:new g,fan:0,sway:new q,swayV:new q,glideT:0,glideK:0,q0:new Ee,q1:new Ee,p0:new g,p1:new g,before:new Ue,modeBefore:"rest"},y=new Ft(new g(0,1,0),0),m=new g,v=new g,T=new g,V=new g,M=new g,L=new g,C=new g,U=new g(0,1,0),B=new Ue,k=new Ue,l=new Ee,S=new g(1,1,1),E=new Float64Array(3),R=new g,f=new g,P=new g,Z=new Xo;function X(D,$,I,N){M.subVectors($,D).normalize();let H=Math.abs(M.y)>.95?m.set(1,0,0):U;return C.crossVectors(M,H).normalize(),L.crossVectors(C,M).normalize(),I&&(l.setFromAxisAngle(M,I),L.applyQuaternion(l),C.applyQuaternion(l)),N.makeBasis(M,L,C).setPosition(D)}function n(D){o.c.group.matrix.copy(D),o.c.group.matrixWorldNeedsUpdate=!0}function pe(D,$,I){$.setFromMatrixPosition(D),I.set(eo,0,0).applyMatrix4(D)}let O=()=>Math.min(eo,o.c.b+.7+o.c.ashLen+.6);function j(){let $=O();for(let I=0;I<3;I++){let N=0,H=0,te=0,he=0;for(let Oe=0;Oe<10;Oe++){let fe=Oe/9*$-o.xg;v.copy(M).multiplyScalar(fe).add(o.P);let ze=e(v.x,v.y,v.z,E)-Za,De=E[0],ve=E[1],x=E[2],G=v.y-Za;G<ze&&(ze=G,De=0,ve=1,x=0),ze<N&&(N=ze,H=De,te=ve,he=x)}if(N>=0)return;o.P.x-=H*N,o.P.y-=te*N,o.P.z-=he*N;let oe=o.V.x*H+o.V.y*te+o.V.z*he;oe<0&&(o.V.x-=oe*H,o.V.y-=oe*te,o.V.z-=oe*he)}}let J={st:o,get busy(){return o.mode==="held"||o.mode==="glide"||o.mode==="fall"},reset(D){o.c=D,o.mode="rest",o.fan=0,o.sway.set(0,0),o.swayV.set(0,0),D.ash.rotation.set(0,0,0)},pick(D,$){o.c=D,o.before.copy(D.group.matrix),o.modeBefore=o.mode,k.copy(D.group.matrix).invert(),m.copy($).applyMatrix4(k),o.xg=le.clamp(m.x,4,O()-2),pe(D.group.matrix,T,V),M.subVectors(V,T).normalize(),o.P.copy(M).multiplyScalar(o.xg).add(T),o.V.set(0,0,0),o.yaw=Math.atan2(M.z,M.x),o.pitch=Math.asin(le.clamp(M.y,-1,1)),o.dYaw=o.dPitch=o.vYaw=o.vPitch=0,o.baseY=o.P.y,o.holdY=o.P.y+25,o.lift=0,o.T.copy(o.P),o.offSet=!1,o.accF.set(0,0,0),o.mode="held",i()},aim(D){if(y.constant=-o.holdY,Z.copy(D),!Z.intersectPlane(y,v))return;o.offSet||(o.off.set(o.P.x-v.x,0,o.P.z-v.z),o.offSet=!0),v.add(o.off),v.y=o.T.y;let $=Math.hypot(v.x,v.z);if($>160){let I=(160+50*Math.tanh(($-160)/50))/$;v.x*=I,v.z*=I}o.T.copy(v)},twist(D){o.yaw+=D},cancel(){o.mode==="held"&&(n(o.before),o.V.set(0,0,0),o.mode=o.modeBefore==="lying"?"lying":"rest",i())},release(){if(o.mode!=="held")return-1;pe(o.c.group.matrix,T,V);let D=-1,$=12;for(let I=0;I<3;I++){let N=r(I),H=_r(N,T,V);H.across<$&&H.above>-6&&H.above<45&&($=H.across,D=I)}return D>=0?(J.glideTo(D),D):(m.copy(o.V),d.drop([T.x,T.y,T.z],[V.x,V.y,V.z],[m.x,m.y,m.z],[m.x,m.y,m.z]),d.roll=0,o.mode="fall",i(),-1)},glideTo(D){o.c.group.matrix.decompose(o.p0,o.q0,S),s(D,B),B.decompose(o.p1,o.q1,S),o.glideK=D,o.glideT=0,o.mode="glide",i()},update(D,$){let I=o.c;if(!I)return!1;if(o.mode==="held"){o.lift=Math.min(1,o.lift+D/.35),o.T.y=o.baseY+25*o.lift*o.lift*(3-2*o.lift),R.copy(o.P),f.copy(o.V);let H=220,te=2*Math.sqrt(H)*.72,he=3,oe=D/he;m.set(H*(o.T.x-o.P.x)-te*o.V.x,H*(o.T.y-o.P.y)-te*o.V.y,H*(o.T.z-o.P.z)-te*o.V.z);for(let se=0;se<he;se++)o.V.x+=(H*(o.T.x-o.P.x)-te*o.V.x)*oe,o.V.y+=(H*(o.T.y-o.P.y)-te*o.V.y)*oe,o.V.z+=(H*(o.T.z-o.P.z)-te*o.V.z)*oe,o.P.addScaledVector(o.V,oe);o.acc.subVectors(o.V,f).divideScalar(Math.max(D,1e-4)),o.accF.lerp(m,1-Math.exp(-Math.max(D,.016)/.03));let Oe=.35+Math.abs(eo*.42-o.xg)/eo,fe=-Math.sin(o.yaw),ze=Math.cos(o.yaw),De=o.acc.x*fe+o.acc.z*ze,ve=90,x=2*Math.sqrt(ve)*.45;o.vYaw+=(-ve*o.dYaw-x*o.vYaw-De/9e3*Oe*ve)*D,o.vPitch+=(-ve*o.dPitch-x*o.vPitch-o.acc.y/9e3*Oe*ve)*D,o.dYaw=le.clamp(o.dYaw+o.vYaw*D,-.26,.26),o.dPitch=le.clamp(o.dPitch+o.vPitch*D,-.22,.22),o.pitch+=(le.degToRad(-6)-o.pitch)*Math.min(1,D*3);let G=o.yaw+o.dYaw,Q=o.pitch+o.dPitch;M.set(Math.cos(G)*Math.cos(Q),Math.sin(Q),Math.sin(G)*Math.cos(Q)),j(),T.copy(M).multiplyScalar(-o.xg).add(o.P),V.copy(M).multiplyScalar(eo).add(T),n(X(T,V,o.roll,B))}else if(o.mode==="glide"){o.glideT=Math.min(1,o.glideT+D/.45);let H=o.glideT,te=1-Math.pow(1-H,3);m.lerpVectors(o.p0,o.p1,te),m.y+=Math.sin(Math.min(1,H*1.25)*Math.PI)*6*(1-H)+(H>.8?-.6*Math.sin((H-.8)/.2*Math.PI):0),l.slerpQuaternions(o.q0,o.q1,te),B.compose(m,l,S),n(B),o.V.set(0,0,0),H>=1&&(I.notch=o.glideK,o.mode="rest",i())}else o.mode==="fall"&&(d.step(D),T.set(d.A[0],d.A[1],d.A[2]),V.set(d.B[0],d.B[1],d.B[2]),n(X(T,V,d.roll,B)),o.V.set(0,0,0),d.awake||(o.mode="lying",i()));let N=o.mode==="held"?o.V.length():0;if(o.fan=Math.max(o.fan*Math.exp(-D/1),Math.min(1,N/420)),o.mode==="held"&&$&&I.ashLen>.6){pe(I.group.matrix,T,V),M.subVectors(V,T).normalize(),C.crossVectors(M,U).normalize(),L.crossVectors(C,M).normalize();let H=o.acc.dot(L),te=o.acc.dot(C),he=140,oe=2*Math.sqrt(he)*.35;o.swayV.x+=(-he*o.sway.x-oe*o.swayV.x-H/6e3*he*.12)*D,o.swayV.y+=(-he*o.sway.y-oe*o.swayV.y-te/6e3*he*.12)*D,o.sway.x=le.clamp(o.sway.x+o.swayV.x*D,-.2,.2),o.sway.y=le.clamp(o.sway.y+o.swayV.y*D,-.2,.2),I.ash.rotation.set(0,o.sway.y,o.sway.x),o.accF.length()>9e3*(1.3-.6*(I.ashLen/15))&&(p(I,o.V),o.sway.set(0,0),o.swayV.set(0,0),I.ash.rotation.set(0,0,0))}else(o.sway.x||o.sway.y)&&(o.sway.multiplyScalar(Math.exp(-D*6)),Math.abs(o.sway.x)+Math.abs(o.sway.y)<.001&&o.sway.set(0,0),I.ash.rotation.set(0,o.sway.y,o.sway.x));return J.busy}};return J}var Wa={across:0,above:0};function _r(a,e,s){let r=s.x-e.x,u=s.z-e.z,p=Math.min(1,Math.max(0,((a.x-e.x)*r+(a.z-e.z)*u)/(r*r+u*u||1))),i=e.x+r*p,d=e.z+u*p;return Wa.across=Math.hypot(a.x-i,a.z-d),Wa.above=e.y+(s.y-e.y)*p-a.y,Wa}function yn({spheres:a,s:e=12,mass:s=[4,1,1,1],sdf:r,floorY:u=0,friction:p=9}){let i=new Float64Array(12),d=new Float64Array(12),o=new Float64Array(12),y=new Float64Array(12),m=s.map(k=>1/k),v=new Float64Array(6),T=[0,1,0,2,0,3,1,2,1,3,2,3],V=new Float64Array(3),M=new Float64Array(9),L=new Float64Array(4),C={P:i,awake:!1,contact:!1,restFor:0,set(k,l,S,E,R=null){for(let f=0;f<3;f++)i[f]=k[f],i[3+f]=k[f]+l[f]*e,i[6+f]=k[f]+S[f]*e,i[9+f]=k[f]+E[f]*e;for(let f=0;f<6;f++){let P=T[f*2]*3,Z=T[f*2+1]*3;v[f]=Math.hypot(i[P]-i[Z],i[P+1]-i[Z+1],i[P+2]-i[Z+2])}for(let f=0;f<12;f++)o[f]=R?R[f%3]:0;y.set(i),C.awake=!0,C.restFor=0},frame(k){U(),k[0]=i[0],k[1]=i[1],k[2]=i[2];for(let l=0;l<9;l++)k[3+l]=M[l];return k},step(k){if(!C.awake)return!1;let l=Math.max(2,Math.ceil(k/.004));for(let E=0;E<l;E++)B(k/l);C.restFor+=k;let S=0;for(let E=0;E<12;E++)S=Math.max(S,Math.abs(i[E]-y[E]));return S>.25||!C.contact?(C.restFor=0,y.set(i)):C.restFor>.33&&(C.awake=!1,o.fill(0)),!0}};function U(){let k=i[3]-i[0],l=i[4]-i[1],S=i[5]-i[2],E=Math.hypot(k,l,S)||1;k/=E,l/=E,S/=E;let R=i[6]-i[0],f=i[7]-i[1],P=i[8]-i[2],Z=R*k+f*l+P*S;R-=Z*k,f-=Z*l,P-=Z*S,E=Math.hypot(R,f,P)||1,R/=E,f/=E,P/=E,M[0]=k,M[1]=l,M[2]=S,M[3]=R,M[4]=f,M[5]=P,M[6]=l*P-S*f,M[7]=S*R-k*P,M[8]=k*f-l*R}function B(k){for(let l=0;l<12;l++)d[l]=i[l];for(let l=0;l<4;l++)o[l*3+1]+=-9810*k;for(let l=0;l<12;l++)i[l]+=o[l]*k;C.contact=!1;for(let l=0;l<3;l++){for(let S=0;S<6;S++){let E=T[S*2],R=T[S*2+1],f=i[R*3]-i[E*3],P=i[R*3+1]-i[E*3+1],Z=i[R*3+2]-i[E*3+2],X=Math.hypot(f,P,Z)||1,n=(X-v[S])/X/(m[E]+m[R]);i[E*3]+=f*n*m[E],i[E*3+1]+=P*n*m[E],i[E*3+2]+=Z*n*m[E],i[R*3]-=f*n*m[R],i[R*3+1]-=P*n*m[R],i[R*3+2]-=Z*n*m[R]}U();for(let S of a){let E=S[0],R=S[1],f=S[2],P=i[0]+M[0]*E+M[3]*R+M[6]*f,Z=i[1]+M[1]*E+M[4]*R+M[7]*f,X=i[2]+M[2]*E+M[5]*R+M[8]*f,n=r(P,Z,X,V)-S[3],pe=V[0],O=V[1],j=V[2],J=Z-u-S[3];if(J<n&&(n=J,pe=0,O=1,j=0),n>=0)continue;C.contact=!0,L[1]=E/e,L[2]=R/e,L[3]=f/e,L[0]=1-L[1]-L[2]-L[3];let D=0;for(let I=0;I<4;I++)D+=L[I]*L[I]*m[I];let $=-n/(D||1);for(let I=0;I<4;I++){let N=$*L[I]*m[I];i[I*3]+=pe*N,i[I*3+1]+=O*N,i[I*3+2]+=j*N}}}for(let l=0;l<12;l++)o[l]=(i[l]-d[l])/k;for(let l=0;l<4;l++){let S=Math.hypot(o[l*3],o[l*3+1],o[l*3+2]);if(S>1500)for(let E=0;E<3;E++)o[l*3+E]*=1500/S}if(C.contact){let l=Math.exp(-k*p);for(let S=0;S<4;S++)o[S*3]*=l,o[S*3+2]*=l}}return C}function Ct(a,e,s){let r=a*374761393+e*668265263+s*2147483647|0;return r=Math.imul(r^r>>>13,1274126177),r^=r>>>16,(r&65535)/32767.5-1}var Ka=a=>a*a*a*(a*(a*6-15)+10),Nt=(a,e,s)=>a+(e-a)*s;function Ce(a,e,s){let r=Math.floor(a),u=Math.floor(e),p=Math.floor(s),i=Ka(a-r),d=Ka(e-u),o=Ka(s-p);return Nt(Nt(Nt(Ct(r,u,p),Ct(r+1,u,p),i),Nt(Ct(r,u+1,p),Ct(r+1,u+1,p),i),d),Nt(Nt(Ct(r,u,p+1),Ct(r+1,u,p+1),i),Nt(Ct(r,u+1,p+1),Ct(r+1,u+1,p+1),i),d),o)}var ra=(a,e,s)=>a<e?e:a>s?s:a;function bn(a,e,s){let r=Math.max(s-Math.abs(a-e),0)/s;return Math.min(a,e)-r*r*s*.25}function ia(a,e,s){let r=Math.max(s-Math.abs(a-e),0)/s;return Math.max(a,e)+r*r*s*.25}var Tt={w:24,h:62,d:12,bodyTop:22.5,button:{y:13,len:9,w:3.4,x:12},flameY:30.5},dt={a:11.2,b:5.5,wall:.55,grow:.12,y0:Tt.bodyTop-.6,y1:Tt.h/2,holeY:27.2,holeR:.8,holes:18};var Qa=Tt.h,Hr=Tt.w/2,xn=Tt.d/2,to=Tt.bodyTop+4.6,En=22,Tn=1.2,Mn=[90,62,36,12,-12,-32].map(a=>a*Math.PI/180),Eo=12;function Pr(a=96){let e=dt,s=e.grow,r=e.wall+2*s,u=[],p=e.y1-r/2;u.push([s,e.y0,1,0],[s,p,1,0]);for(let L=1;L<8;L++){let C=L/8*Math.PI;u.push([s-r/2+r/2*Math.cos(C),p+r/2*Math.sin(C),Math.cos(C),Math.sin(C)])}u.push([s-r,p,-1,0],[s-r,e.y0,-1,0]);let i=(a+1)*u.length,d=new Float32Array(i*3),o=new Float32Array(i*3),y=new Float32Array(i*3).fill(1),m=new Float32Array(i*2),v=0;for(let L=0;L<=a;L++){let C=L/a*Math.PI*2,U=e.a*Math.cos(C),B=e.b*Math.sin(C),k=Math.cos(C)/e.a,l=Math.sin(C)/e.b,S=Math.hypot(k,l);k/=S,l/=S;for(let[E,R,f,P]of u)d.set([U+k*E,R,B+l*E],v*3),o.set([k*f,P,l*f],v*3),m.set([1,1],v*2),v++}let T=[],V=u.length;for(let L=0;L<a;L++)for(let C=0;C<V-1;C++){let U=L*V+C,B=(L+1)*V+C;T.push(U,B,U+1,B,B+1,U+1)}let M=new ft;return M.setAttribute("position",new ae(d,3)),M.setAttribute("normal",new ae(o,3)),M.setAttribute("color",new ae(y,3)),M.setAttribute("aZone",new ae(m,2)),M.setIndex(T),M}function Ar(a){return new Se({uniforms:{uTime:a.uTime,uFlame:a.uFlame,uSeed:{value:.37}},vertexShader:`
      uniform float uFlame;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        // the card stands on the burner along the object's own y (bent and stretched in its
        // matrix), and turns about that axis to face the camera
        vec3 up = normalize((modelMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
        vec3 base = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        float len = length((modelMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
        vec3 toCam = normalize(cameraPosition - base);
        vec3 side = normalize(cross(up, toCam) + vec3(1e-5));
        vec3 p = base + side * position.x * 7.5 * (0.6 + 0.4 * uFlame) + up * (position.y * 24.0 * len * uFlame);
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,fragmentShader:`
      uniform float uTime; uniform float uFlame; uniform float uSeed;
      varying vec2 vUv;
      float h1(float n) { return fract(sin(n) * 43758.5453); }
      float vn(vec2 x) { vec2 i = floor(x); vec2 f = fract(x); f = f * f * (3.0 - 2.0 * f); float n = i.x + i.y * 57.0;
        return mix(mix(h1(n), h1(n + 1.0), f.x), mix(h1(n + 57.0), h1(n + 58.0), f.x), f.y); }
      void main() {
        // x across (-1..1), y up (0 at the burner, 1 at the tip)
        vec2 q = vec2(vUv.x * 2.0 - 1.0, vUv.y);
        float t = uTime;
        // layered flicker: the flame's edge wobbles, more towards the tip
        float w = (vn(vec2(q.y * 3.0 - t * 7.0, uSeed * 9.0)) - 0.5) * 0.35 + (vn(vec2(q.y * 7.0 - t * 13.0, 3.1)) - 0.5) * 0.15;
        q.x += w * q.y * q.y;
        // a teardrop: round at the base, drawn to a soft point at the tip
        float r = mix(0.42, 0.04, pow(q.y, 0.85)) * smoothstep(0.0, 0.14, q.y) + 0.04;
        float d = abs(q.x) / r;
        float body = smoothstep(1.0, 0.25, d) * smoothstep(1.02, 0.86, q.y);
        // blue at the base, translucent; a clear core; soft yellow-orange towards the tip
        float base = smoothstep(0.32, 0.02, q.y) * smoothstep(1.0, 0.45, d);
        float core = smoothstep(0.55, 0.0, d) * smoothstep(0.1, 0.35, q.y) * smoothstep(0.75, 0.4, q.y);
        float tip = smoothstep(0.18, 0.7, q.y);
        vec3 col = vec3(0.25, 0.45, 1.6) * base * 0.9;
        col += vec3(1.9, 0.95, 0.32) * body * tip * (1.0 - 0.75 * core);
        col += vec3(1.2, 0.55, 0.18) * body * (1.0 - tip) * (1.0 - base) * 0.6;
        col *= uFlame;
        // (its alpha adds to the bloom mask: over anything drawn it rises above 1, so it blooms)
        gl_FragColor = vec4(col, min(1.0, dot(col, vec3(0.4))));
      }`,transparent:!0,depthWrite:!1,blending:vo,blendEquation:Vs,blendSrc:rt,blendDst:rt,blendSrcAlpha:rt,blendDstAlpha:rt,side:Xt})}function Rn({mesh:a,tex:e,U:s,sdf:r,sdfGrad:u,groundGrad:p,cigCapsule:i,target:d,onIgnite:o,rest:y={x:-30,z:92,theta:0}}){let m=new Ze({color:16777215,metalness:.62,roughness:.46,vertexColors:!0});m.onBeforeCompile=_=>{_.uniforms.tBead={value:e.bead},_.vertexShader=_.vertexShader.replace("#include <common>",`#include <common>
attribute vec2 aZone;
varying vec2 vZone;
varying vec3 vLP;
varying vec3 vLN;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vZone = aZone;
vLP = position;
vLN = normal;`),_.fragmentShader=_.fragmentShader.replace("#include <common>",`#include <common>
        varying vec2 vZone; varying vec3 vLP; varying vec3 vLN; uniform sampler2D tBead;
        float steel; vec3 beadN;
        vec4 tri(vec3 p, vec3 n, float s) { vec3 w = pow(abs(n), vec3(4.0)); w /= dot(w, vec3(1.0));
          return texture2D(tBead, p.yz * s) * w.x + texture2D(tBead, p.zx * s) * w.y + texture2D(tBead, p.xy * s) * w.z; }`).replace("#include <color_fragment>",`#include <color_fragment>
        steel = vZone.x;
        if (vZone.y > 0.5 && abs(vLP.y - ${dt.holeY.toFixed(2)}) < ${(dt.holeR+.1).toFixed(2)}) {
          // the chimney's row of holes
          float ang = atan(vLP.z / ${dt.b.toFixed(2)}, vLP.x / ${dt.a.toFixed(2)});
          float per = 6.2831853 / ${dt.holes.toFixed(1)};
          float ha = floor(ang / per + 0.5) * per;
          vec2 hc = vec2(cos(ha) * ${dt.a.toFixed(2)}, sin(ha) * ${dt.b.toFixed(2)});
          if (length(vec2(length(vLP.xz - hc), vLP.y - ${dt.holeY.toFixed(2)})) < ${dt.holeR.toFixed(2)}) discard;
        }
        vec4 bead = tri(vLP, normalize(vLN), 0.35);
        // (linear) deep olive, a little uneven; steel; the parting line and the screw's head ring
        vec3 olive = vec3(0.092, 0.104, 0.05) * (0.92 + 0.16 * bead.a);
        vec3 st = vec3(0.56, 0.56, 0.55) * (0.94 + 0.08 * bead.g);
        float part = (1.0 - smoothstep(0.06, 0.16, abs(vLP.y - 14.0))) * (1.0 - steel);
        float screw = (1.0 - smoothstep(0.08, 0.16, abs(length(vLP.xz) - 1.25))) * step(vLP.y, -30.4);
        diffuseColor.rgb = mix(olive, st, steel) * (1.0 - 0.55 * part - 0.6 * screw) * vColor.rgb;`).replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
        // bead-blast: an even satin; the chimney brushed (streaks round it)
        roughnessFactor = mix(0.46 + 0.06 * bead.b, 0.24 + 0.12 * bead.r, steel);`).replace("#include <metalnessmap_fragment>",`#include <metalnessmap_fragment>
        metalnessFactor = mix(0.45, 1.0, steel);`)},m.customProgramCacheKey=()=>"lighter-body";let v=new ft;v.setAttribute("position",new ae(a.positions,3)),v.setAttribute("normal",new ae(a.normals,3));let T=new Float32Array(a.ao.length*3);for(let _=0;_<a.ao.length;_++)T[_*3]=T[_*3+1]=T[_*3+2]=.55+.45*a.ao[_];v.setAttribute("color",new ae(T,3)),v.setAttribute("aZone",new ae(a.zone,2)),v.setIndex(new ae(a.indices,1));let V=new Te(v,m);V.castShadow=V.receiveShadow=!0;let M=new Te(Pr(),m);M.castShadow=M.receiveShadow=!0;let L=Tt.button,C=new Qs(L.w/2-.15,L.len-L.w,6,24);C.scale(.32,1,1);let U=new Ze({color:14079700,metalness:1,roughness:.12}),B=new Te(C,U);B.position.set(L.x-.42,L.y,0),B.castShadow=!0;let k=Ar(s),l=new Jt(1,1,1,8).translate(0,.5,0),S=new Te(l,k);S.frustumCulled=!1,S.renderOrder=10;let E=new Dt;E.position.set(0,to,0),E.add(S);let R=new Te(new Jt(4,4),new Se({uniforms:{uSpark:{value:0}},vertexShader:"varying vec2 vUv; void main() { vUv = uv; vec4 c = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0); c.xy += position.xy; gl_Position = projectionMatrix * c; }",fragmentShader:"uniform float uSpark; varying vec2 vUv; void main() { float r = length(vUv - 0.5) * 2.0; float k = uSpark * exp(-r * r * 9.0); gl_FragColor = vec4(vec3(1.6, 1.4, 1.0) * k, k); }",transparent:!0,depthWrite:!1,blending:vo,blendSrc:rt,blendDst:rt,blendSrcAlpha:rt,blendDstAlpha:rt}));R.position.set(0,Tt.bodyTop+3.2,0),R.frustumCulled=!1,R.renderOrder=11;let f=new Dt;f.matrixAutoUpdate=!1,f.add(V,M,B,E,R);let P=new Ue;{let _=new Ee().setFromEuler(new Gt(Math.PI/2,Math.PI/2-y.theta,0,"YXZ"));P.compose(new g(y.x,xn,y.z),_,new g(1,1,1))}f.matrix.copy(P);let Z=[];for(let _ of[-1,1])for(let ie of[-1,0,1])for(let ne of[-1,1])Z.push([_*(Hr-4.2),ie*(Qa/2-5)-1,ne*(xn-4.2),4.2]);Z.push([0,Qa/2-5,0,5.5]);let X=yn({spheres:Z,s:26,mass:[4,1,1,1],sdf:p}),n={mode:"rest",lit:0,glow:0,want:!1,out:!1,press:0,spark:0,sputter:0,P:new g,V:new g,T:new g,G:new g,off:new g,offSet:!1,holdY:0,yaw:0,up:0,q0:new Ee,lean:new q,leanV:new q,bend:new g,bendV:new g,speed:0,near:0,reach:0,stuck:0,glideT:0,flameDir:new g(0,1,0),flameLen:0,blowSpeed:900},pe=new Ft(new g(0,1,0),0),O=new g,j=new g,J=new g,D=new Ee,$=new Ee,I=new Ee,N=new Ue,H=new g(1,1,1),te=new g(0,1,0),he=new Float64Array(3),oe=new Float64Array(12),Oe=new g,fe=new g,ze=new g,De=new g,ve=new Gt,x=[new g,new g,new g],G=new g,Q=new Ee;P.decompose(G,Q,O);let se=new g,Le=new Ee,W=new Ue;function de(_,ie){let ne=0,Be=-1;for(let me=0;me<Z.length;me++){let ge=Z[me];O.set(ge[0],ge[1],ge[2]).applyMatrix4(_);let He=Math.min(O.y,r(O.x,O.y,O.z))-ge[3],Fe=i(O,j)-ge[3];Fe<He&&(He=Fe),He<ne&&(ne=He,Be=me)}if(ie&&Be>=0){let me=Z[Be];O.set(me[0],me[1],me[2]).applyMatrix4(_);let ge=u(O.x,O.y,O.z,he),He=i(O,j);O.y<=ge&&O.y<=He?J.set(0,1,0):ge<=He?J.set(he[0],he[1],he[2]):J.copy(j)}return ne}function Ge(){for(let _=0;_<3;_++){let ie=de(f.matrix,!0);if(ie>=0)return;n.P.addScaledVector(J,-ie),f.matrix.elements[12]=n.P.x,f.matrix.elements[13]=n.P.y,f.matrix.elements[14]=n.P.z}}let A={end:-1,C:new g,i:0,n:Mn.length*Eo,score:1/0,q:new Ee,p:new g,side:new g,has:!1,cScore:1/0,cq:new Ee,cp:new g},ue=new g,Me=new g,Ie=new g,Ne=new Ue,tt=new g,ao=new g,_t=new g;function Mo(_,ie,ne,Be){j.subVectors(_,ie);let me=Math.min(Be,Math.max(1,j.dot(ne)));return j.addScaledVector(ne,-me).length()}function ha(_){let ie=Math.floor(_/Eo),ne=Mn[ie];if(ie===0&&_%Eo>=6)return;let Be=_%Eo/Eo*Math.PI*2,me=Math.cos(Be),ge=Math.sin(Be),He=Math.cos(ne),Fe=Math.sin(ne);ue.set(He*me,Fe,He*ge),Me.set(-ge,0,me),Ie.crossVectors(Me,ue),Ne.makeBasis(Me,ue,Ie),ao.copy(ue).addScaledVector(te,Tn).normalize(),tt.copy(A.C).addScaledVector(ao,-7),_t.copy(tt).addScaledVector(ue,-to),Ne.setPosition(_t);let qe=0;for(let Ke=0;Ke<3&&(qe=de(Ne,!0),!(qe>=0));Ke++)_t.addScaledVector(J,-qe),Ne.setPosition(_t);qe=Math.min(0,de(Ne,!1)),tt.copy(_t).addScaledVector(ue,to);let pt=Mo(A.C,tt,ao,En*.8),gt=Math.max(0,pt-3)*10-qe*30+(1-Fe)*2.5+(1-(me*A.side.x+ge*A.side.z))*4;gt<A.cScore&&(A.cScore=gt,A.cq.setFromRotationMatrix(Ne),A.cp.copy(_t))}function ce(_){A.i=0,A.cScore=1/0,A.side.set(A.C.x-_.x,0,A.C.z-_.z),A.side.lengthSq()<1e-6&&A.side.set(1,0,0),A.side.normalize()}function Ro(){if(!d.on||!(n.want&&!n.out))return 0;let _=Math.hypot(n.T.x-d.foot.x,n.T.z-d.foot.z),ie=d.filterOn?Math.hypot(n.T.x-d.filter.x,n.T.z-d.filter.z):1/0,ne=_<=ie?0:1,Be=Math.min(_,ie),me=1-le.smoothstep(Be,12,30);if(me<=0)return 0;if(ne===0?O.copy(d.foot).addScaledVector(d.axis,1.5):O.copy(d.filter).addScaledVector(d.axis,-1.5),(ne!==A.end||O.distanceToSquared(A.C)>1)&&(A.end=ne,A.C.copy(O),A.has=!1,ce(n.P)),A.i<A.n){for(let ge=0;ge<6&&A.i<A.n;ge++)ha(A.i++);A.i>=A.n&&(A.score=A.cScore,A.q.copy(A.cq),A.p.copy(A.cp),A.has=A.score<1/0)}return A.has?me:0}let Ht={group:f,meshes:[V,M,B],st:n,flame:S,btn:B,flameTip:ze,flameBase:De,get busy(){return n.mode!=="rest"||n.lit>0||n.spark>0||n.press>.01},flamePoints(){return De.set(0,to,0).applyMatrix4(f.matrix),ze.copy(De).addScaledVector(n.flameDir,n.flameLen*.85),ze},flameDist(_){return n.lit<=.05?1/0:(Ht.flamePoints(),Mo(_,De,n.flameDir,n.flameLen*.9))},reset(){n.mode="rest",n.lit=0,n.glow=0,n.want=!1,n.out=!1,n.press=0,n.reach=0,f.matrix.copy(P),f.matrixWorldNeedsUpdate=!0},pick(_){W.copy(f.matrix),n.P.setFromMatrixPosition(f.matrix),n.V.set(0,0,0),f.matrix.decompose(O,n.q0,j),n.yaw=0,n.up=0,n.reach=0,A.end=-1,A.has=!1,n.holdY=Math.max(n.P.y,Qa/2+2)+6,n.T.copy(n.P),n.T.y=n.holdY,n.offSet=!1,n.lean.set(0,0),n.leanV.set(0,0),n.mode="held"},aim(_){if(pe.constant=-n.holdY,!_.intersectPlane(pe,j))return;n.offSet||(n.off.set(n.P.x-j.x,0,n.P.z-j.z),n.offSet=!0),j.add(n.off);let ie=Math.hypot(j.x,j.z);if(ie>170){let ne=(170+45*Math.tanh((ie-170)/45))/ie;j.x*=ne,j.z*=ne}n.T.copy(j)},twist(_){n.yaw+=_},cancel(){n.want=!1,n.lit=0,n.reach=0,f.matrix.copy(W),f.matrixWorldNeedsUpdate=!0,n.mode="rest"},release(){if(n.mode!=="held")return;n.want=!1,n.lit=0,f.matrix.decompose(O,D,j);let[_,ie,ne]=x;_.set(1,0,0).applyQuaternion(D),ie.set(0,1,0).applyQuaternion(D),ne.set(0,0,1).applyQuaternion(D),X.set([O.x,O.y,O.z],[_.x,_.y,_.z],[ie.x,ie.y,ie.z],[ne.x,ne.y,ne.z],[n.V.x,n.V.y,n.V.z]),n.mode="fall"},home(){n.want=!1,n.lit=0,n.reach=0,!(n.mode==="rest"&&f.matrix.equals(P))&&(f.matrix.decompose(se,Le,O),n.glideT=0,n.mode="glide")},ignite(_){_&&n.mode==="held"&&!n.want&&(n.want=!0,n.out=!1,n.spark=1,o()),_||(n.want=!1,n.out=!1)},update(_,ie){if(n.mode==="held"){let Fe=Ro();n.reach+=(Fe-n.reach)*Math.min(1,_*7);let qe=n.reach*n.reach*(3-2*n.reach);n.G.copy(n.T),qe>.001&&(O.copy(A.p),O.x+=(n.T.x-A.C.x)*.35,O.z+=(n.T.z-A.C.z)*.35,n.G.lerp(O,qe),Math.hypot(n.P.x-n.G.x,n.P.z-n.G.z)>8&&(n.G.y=Math.max(n.G.y,74))),Oe.copy(n.V);let pt=200,gt=2*Math.sqrt(pt)*.72;for(let Pt=0;Pt<3;Pt++){let F=_/3;n.V.x+=(pt*(n.G.x-n.P.x)-gt*n.V.x)*F,n.V.y+=(pt*(n.G.y-n.P.y)-gt*n.V.y)*F,n.V.z+=(pt*(n.G.z-n.P.z)-gt*n.V.z)*F,n.P.addScaledVector(n.V,F)}fe.subVectors(n.V,Oe).divideScalar(Math.max(_,1e-4));let Ke=80,je=2*Math.sqrt(Ke)*.5;n.leanV.x+=(-Ke*n.lean.x-je*n.leanV.x+fe.z/9e3*Ke*.25)*_,n.leanV.y+=(-Ke*n.lean.y-je*n.leanV.y-fe.x/9e3*Ke*.25)*_,n.lean.x=le.clamp(n.lean.x+n.leanV.x*_,-.3,.3),n.lean.y=le.clamp(n.lean.y+n.leanV.y*_,-.3,.3),n.up=Math.min(1,n.up+_/.35);let So=n.up*n.up*(3-2*n.up);$.setFromEuler(ve.set(n.lean.x,n.yaw,n.lean.y)),qe>.001&&(I.setFromEuler(ve.set(n.lean.x*.4,0,n.lean.y*.4)),I.premultiply(A.q),$.slerp(I,qe)),D.slerpQuaternions(n.q0,$,So),N.compose(n.P,D,H),f.matrix.copy(N),Ge(),qe>.95&&A.i>=A.n&&n.P.distanceToSquared(n.G)>36?n.stuck+=_:n.stuck=0,n.stuck>.35&&(n.stuck=0,ce(n.P)),f.matrixWorldNeedsUpdate=!0,n.speed=n.V.length()}else if(n.mode==="fall")X.step(_),X.frame(oe),f.matrix.makeBasis(O.set(oe[3],oe[4],oe[5]),j.set(oe[6],oe[7],oe[8]),J.set(oe[9],oe[10],oe[11])),f.matrix.setPosition(oe[0],oe[1],oe[2]),f.matrixWorldNeedsUpdate=!0,n.speed=0,X.awake||(n.mode="rest");else if(n.mode==="glide"){n.glideT=Math.min(1,n.glideT+_/.6);let Fe=n.glideT<.5?4*n.glideT**3:1-(-2*n.glideT+2)**3/2;O.lerpVectors(se,G,Fe),O.y+=Math.sin(Math.PI*Fe)*14,D.slerpQuaternions(Le,Q,Fe),f.matrix.compose(O,D,H),f.matrixWorldNeedsUpdate=!0,n.speed=0,n.glideT>=1&&(f.matrix.copy(P),n.mode="rest")}n.want&&!n.out&&n.speed>n.blowSpeed&&(n.out=!0,n.want=!1);let ne=n.want&&!n.out&&n.mode==="held";n.lit=ne?Math.min(1,n.lit+_/.08):0,n.press+=((n.want?1:0)-n.press)*Math.min(1,_*30),n.press<.001&&(n.press=0),B.position.x=Tt.button.x-.42-.7*n.press,n.spark=Math.max(0,n.spark-_/.07),R.material.uniforms.uSpark.value=n.spark,R.visible=n.spark>0,n.lit>0&&Math.random()<_*.25&&(n.sputter=1),n.sputter=Math.max(0,n.sputter-_/.18);let Be=.9+.07*Ce(ie*9,.3,.7)+.05*Ce(ie*23,4.1,.2)-.35*n.sputter*(.5+.5*Math.sin(ie*80));if(n.glow=n.lit*Be,s.uFlame.value=n.glow,S.visible=n.lit>0,n.lit<=0)return n.bend.set(0,0,0),n.bendV.set(0,0,0),n.near=0,n.flameLen=0,Ht.busy;if(f.matrix.decompose(O,D,j),ue.set(0,1,0).applyQuaternion(D),J.copy(ue).addScaledVector(te,Tn).normalize(),J.addScaledVector(n.V,-1/900),De.set(0,to,0).applyMatrix4(f.matrix),n.near=0,d.on&&A.end>=0){j.subVectors(A.C,De);let Fe=j.length();n.near=le.clamp(1-(Fe-8)/22,0,1),J.addScaledVector(j.normalize(),.5*n.near)}let me=160,ge=2*Math.sqrt(me)*.5;n.bendV.x+=(me*(J.x-n.bend.x)-ge*n.bendV.x)*_,n.bendV.y+=(me*(J.y-n.bend.y)-ge*n.bendV.y)*_,n.bendV.z+=(me*(J.z-n.bend.z)-ge*n.bendV.z)*_,n.bend.addScaledVector(n.bendV,_),n.bend.lengthSq()<1e-4&&n.bend.copy(J),n.flameDir.copy(n.bend).normalize();let He=1+Math.min(.6,n.speed/1500)-.12*n.near;return n.flameLen=En*He*n.lit,D.invert(),O.copy(n.flameDir).applyQuaternion(D).multiplyScalar(He),E.matrixAutoUpdate=!1,E.matrix.makeBasis(j.set(1,0,0),O,J.set(0,0,1)).setPosition(0,to,0),E.matrixWorldNeedsUpdate=!0,Ht.busy}};return Ht}var ke={radius:57.5,height:32,floor:9.2,bowlTop:46.3,bowlBottom:33,notch:{r:4.45,depth:4.6,angles:[.5,.5+2*Math.PI/3+.06,.5+4*Math.PI/3-.05]}},Xa=(a,e)=>a*a+e*e;function Sn(a,e,s,r,u){let p=r,i=u,d=r-s,o=2*u;a=Math.abs(a);let y=a-Math.min(a,e<0?s:r),m=Math.abs(e)-u,v=ra(((p-a)*d+(i-e)*o)/Xa(d,o),0,1),T=a-p+d*v,V=e-i+o*v;return(T<0&&m<0?-1:1)*Math.sqrt(Math.min(Xa(y,m),Xa(T,V)))}function kr(a,e,s,r,u){let p=Math.abs(a)-s+u,i=Math.abs(e)-r+u;return Math.hypot(Math.max(p,0),Math.max(i,0))+Math.min(Math.max(p,i),0)-u}function $a(a){return{rim:.55*Math.sin(2*a+1.3)+.35*Math.sin(3*a+.4)+.18*Math.sin(5*a+2.1),out:.42*Math.sin(2*a+.2)+.25*Math.sin(4*a+1.7),inn:.5*Math.sin(3*a+2.6)+.22*Math.sin(5*a+.9)}}var To=1024,lt=new Float32Array((To+1)*3);for(let a=0;a<=To;a++){let e=$a(a/To*2*Math.PI-Math.PI);lt[a*3]=e.rim,lt[a*3+1]=e.out,lt[a*3+2]=e.inn}var la={rim:0,out:0,inn:0};function Dr(a){let e=(a+Math.PI)/(2*Math.PI)*To,s=Math.min(To-1,Math.max(0,Math.floor(e))),r=e-s;return la.rim=lt[s*3]+(lt[s*3+3]-lt[s*3])*r,la.out=lt[s*3+1]+(lt[s*3+4]-lt[s*3+1])*r,la.inn=lt[s*3+2]+(lt[s*3+5]-lt[s*3+2])*r,la}var Fr=ke.notch.angles.map(a=>$a(a).rim),_n=ke.notch.angles.flatMap(a=>[Math.cos(a),Math.sin(a)]);function oo(a,e,s){let r=ke,u=Math.atan2(s,a),p=Dr(u),i=p.out,d=p.inn,o=p.rim,y=Math.hypot(a*1.006,s),m=o*ra((e-12)/20,0,1),v=e-m,T=2.6,V=Sn(y-i,v-(3+r.height)/2,47-T,r.radius-T,(r.height-3)/2-T)-T;V=bn(V,kr(y-42.6,e-2,3.4,2.1,1.1),1.6);let M=7,L=Sn(y+d,v-(r.floor+48)/2,r.bowlBottom-M,r.bowlTop+3-M+.35,(48-r.floor)/2-M)-M;V=ia(V,-L,2.4);let C=r.notch,U=r.height-C.depth+C.r;if(e>U-C.r-3&&y>36)for(let B=0;B<3;B++){let k=C.angles[B],l=_n[B*2],S=_n[B*2+1],E=a*l+s*S,R=-a*S+s*l,f=ra(E,40,62);if(Math.abs(R)>C.r+3)continue;let P=Math.hypot(E-f,R,e-(U+Fr[B]))-C.r;V=ia(V,-P,1.7)}return V+=.28*Ce(a*.045,e*.06,s*.045)+.08*Ce(a*.16+7,e*.16,s*.16),V}function Hn(a){let e=ke.notch.angles[a],s=ke.height-ke.notch.depth+ke.notch.r+$a(e).rim;return{angle:e,dir:[Math.cos(e),0,Math.sin(e)],y:s-ke.notch.r,r:ke.notch.r}}var xe={length:84,radius:3.9,filter:25,ashMax:15};function Vr(a,e){let s=new La(a.map(([i,d])=>new q(i,d)),e);s.rotateZ(-Math.PI/2);let r=s.attributes.position,u=new Float32Array(r.count),p=new Float32Array(r.count);for(let i=0;i<r.count;i++)u[i]=r.getX(i),p[i]=Math.atan2(r.getZ(i),-r.getY(i))/(2*Math.PI)+.5;return s.setAttribute("aAlong",new ae(u,1)),s.setAttribute("aAround",new ae(p,1)),s}var Pn=`
float eh(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float en(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(eh(i), eh(i + vec3(1, 0, 0)), f.x), mix(eh(i + vec3(0, 1, 0)), eh(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(eh(i + vec3(0, 0, 1)), eh(i + vec3(1, 0, 1)), f.x), mix(eh(i + vec3(0, 1, 1)), eh(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
// the coal's glow at a point: orange-red at the core, deep red at the edges, slowly breathing
vec3 emberGlow(vec3 p, float t, float k) {
  float n = en(p * 1.6 + vec3(0.0, 0.0, t * 0.35)) * 0.65 + en(p * 4.2 - vec3(t * 0.6, 0.0, 0.0)) * 0.35;
  float heat = clamp(n * 1.25 - 0.18 + k * 0.25, 0.0, 1.0);
  vec3 deep = vec3(0.55, 0.04, 0.01);
  vec3 core = vec3(1.0, 0.33, 0.07);
  vec3 white = vec3(1.0, 0.62, 0.32);
  vec3 c = mix(deep, core, smoothstep(0.25, 0.75, heat));
  c = mix(c, white, smoothstep(0.85, 1.0, heat) * 0.5);
  return c * heat * heat;
}
`;function Ja(a,e){let s=e,r=new Ze({color:16777215,roughness:.72,sheen:.4,sheenRoughness:.6,sheenColor:new Ve(.9,.86,.8)}),u={uBurn:{value:64.5},uSeed:{value:.3},uLit:{value:1},uFade:{value:1},uAshScale:{value:1},uPart:{value:0},uLightProg:{value:1},uScorch:{value:0},uFilterScorch:{value:0}};r.userData.u=u,r.onBeforeCompile=m=>{Object.assign(m.uniforms,u,{uTime:s.uTime,uEmber:s.uEmber,tCork:{value:a.cork},tPaper:{value:a.paper},tFibre:{value:a.fibre}}),m.vertexShader=m.vertexShader.replace("#include <common>",`#include <common>
attribute float aAlong;
attribute float aAround;
varying float vAlong;
varying float vAround;
varying vec3 vLocalN;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vAlong = aAlong;
vAround = aAround;
vLocalN = normal;`),m.fragmentShader=m.fragmentShader.replace("#include <common>",`#include <common>
        varying float vAlong; varying float vAround; varying vec3 vLocalN;
        uniform float uBurn; uniform float uSeed; uniform float uLit; uniform float uFade; uniform float uTime; uniform float uEmber; uniform float uPart; uniform float uScorch; uniform float uFilterScorch;
        uniform sampler2D tCork; uniform sampler2D tPaper; uniform sampler2D tFibre;`).replace("#include <color_fragment>",`#include <color_fragment>
        float a = vAround * 6.2831853;
        // the burn line wanders round the cigarette
        float edge = uBurn + 0.42 * sin(a * 3.0 + uSeed * 6.0) + 0.27 * sin(a * 7.0 + 0.4 + uSeed) + 0.15 * sin(a * 13.0 + uSeed * 3.0);
        float d = edge - vAlong;
        if (d < 0.0 || (uPart > 0.5 && (uPart < 1.5 ? d < 4.0 : d >= 4.0))) discard;
        vec3 col;
        if (vAlong < 25.0) {
          // tipping paper: cork-tan with speckles, its overlap seam
          col = texture2D(tCork, vec2(vAround * 3.0, vAlong / 12.5)).rgb;
          float seam = 1.0 - smoothstep(0.0015, 0.004, abs(fract(vAround - 0.21) - 0.5) - 0.497);
          col *= 1.0 - 0.08 * seam;
        } else {
          // cigarette paper: off-white, faint laid lines, a thin glue seam
          vec4 pp = texture2D(tPaper, vec2(vAround * 2.0, vAlong / 18.0));
          col = vec3(0.93, 0.915, 0.885) * (0.985 + 0.015 * pp.r) * (0.97 + 0.03 * pp.g);
          float seam = 1.0 - smoothstep(0.0008, 0.0022, abs(fract(vAround - 0.73) - 0.5) - 0.4985);
          col *= 1.0 - 0.05 * seam;
        }
        // the filter's cut end: cellulose fibres
        float face = smoothstep(-0.6, -0.85, vLocalN.x) * step(vAlong, 0.6);
        col = mix(col, vec3(0.86, 0.82, 0.74) * (0.82 + 0.25 * texture2D(tFibre, vec2(vObjYZ().x, vObjYZ().y) / 7.8 + 0.5).r), face);
        // scorch: cream, amber, brown, then the black char lip at the edge (linear values of
        // sRGB #0f0b0a, #5c331a, #b3733a, #ebd6a8)
        float t = d / 2.6;
        vec3 sc = mix(vec3(0.005, 0.0034, 0.003), vec3(0.107, 0.033, 0.01), smoothstep(0.06, 0.26, t));
        sc = mix(sc, vec3(0.45, 0.17, 0.042), smoothstep(0.26, 0.52, t));
        sc = mix(sc, vec3(0.83, 0.67, 0.39), smoothstep(0.5, 0.82, t));
        col = mix(sc, col, smoothstep(0.75, 1.0, t));
        // a fresh cigarette's foot: the cut tobacco on its end; the scorch a flame leaves there
        float foot = smoothstep(0.55, 0.85, vLocalN.x) * step(83.7, vAlong);
        float fl = fract(sin(dot(floor(vObjP.yz * 6.0), vec2(12.9898, 78.233))) * 43758.5453);
        col = mix(col, vec3(0.12, 0.055, 0.02) * (0.6 + 0.8 * fl), foot);
        float fd = 84.0 - vAlong;
        float fsc = uScorch * (1.0 - smoothstep(0.0, 3.0 * uScorch + 0.2, fd + 0.3 * sin(a * 5.0 + uSeed * 4.0)));
        col = mix(col, mix(vec3(0.02, 0.012, 0.008), vec3(0.45, 0.17, 0.042), smoothstep(0.2, 1.0, fd / max(3.0 * uScorch, 0.3))), fsc * (1.0 - foot * 0.5));
        col *= 1.0 - 0.4 * uFilterScorch * (1.0 - smoothstep(0.0, 3.0, vAlong));
        diffuseColor.rgb = col;
        diffuseColor.a *= uFade;`).replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
        roughnessFactor = mix(0.55, roughnessFactor, step(25.0, vAlong));
        roughnessFactor = mix(0.9, roughnessFactor, smoothstep(0.1, 0.4, d / 2.6));`).replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
        // the ember shows through the thin paper in the last few millimetres
        totalEmissiveRadiance += vec3(1.0, 0.36, 0.1) * uEmber * uLit * exp(-d / 1.05) * 1.4 * smoothstep(0.05, 0.25, d / 2.6) * step(25.0, vAlong) * smoothstep(4.0, 3.0, d);`),m.fragmentShader=m.fragmentShader.replace("#include <opaque_fragment>",`#include <opaque_fragment>
#ifdef OPAQUE
gl_FragColor.a = 1.0 + step(d, 4.0) * step(25.0, vAlong) * uLit;
#endif`),m.fragmentShader=m.fragmentShader.replace("void main() {",`varying vec3 vObjP;
vec2 vObjYZ() { return vObjP.yz; }
void main() {`),m.vertexShader=m.vertexShader.replace("#include <common>",`#include <common>
varying vec3 vObjP;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vObjP = position;`)},r.customProgramCacheKey=()=>"cig-body",r.transparent=!1;let p=Cr(u),i=new Se({uniforms:{uTime:s.uTime,uEmber:s.uEmber,uLit:u.uLit,uFade:u.uFade,uLightProg:u.uLightProg},vertexShader:"varying vec3 vP; varying vec3 vN; void main() { vP = position; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",fragmentShader:`${Pn}
      uniform float uTime; uniform float uEmber; uniform float uLit; uniform float uFade; uniform float uLightProg;
      varying vec3 vP; varying vec3 vN;
      void main() {
        // (being lit: glowing specks round the rim, spreading inwards until they join; until then
        // only the specks are drawn, over the cut tobacco)
        float sp = en(vec3(atan(vP.z, -vP.y) * 3.0, length(vP.yz) * 1.5, 7.0)) + 0.25 * smoothstep(3.9, 0.5, length(vP.yz));
        float lm = smoothstep(sp - 0.08, sp + 0.08, uLightProg * 1.4 - 0.1);
        if (lm < 0.02) discard;
        vec3 c = emberGlow(vP, uTime, uEmber - 1.0) * (4.0 + 12.0 * uEmber) * max(uLit, 0.55 * uLightProg) * lm;
        // where the glow dies the coal is charcoal-dark
        vec3 dark = vec3(0.025, 0.018, 0.016);
        gl_FragColor = vec4((dark + c) * uFade, 2.0); // (alpha above 1: blooms)
      }`}),d=new Ze({color:16777215,roughness:.95});d.onBeforeCompile=m=>{Object.assign(m.uniforms,{uTime:s.uTime,uEmber:s.uEmber,uLit:u.uLit,uFade:u.uFade,uBurn:u.uBurn,uAshScale:u.uAshScale}),m.vertexShader=m.vertexShader.replace("#include <common>",`#include <common>
varying vec3 vAshP;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vAshP = position;`),m.fragmentShader=m.fragmentShader.replace("#include <common>",`#include <common>
        ${Pn}
        varying vec3 vAshP;
        uniform float uTime; uniform float uEmber; uniform float uLit; uniform float uFade; uniform float uBurn; uniform float uAshScale;
        float ashH; float ashCrack; float ashPore; float ashX; vec3 ashQ;
        // a thin line where t is near a whole number, antialiased by its own footprint (it fades
        // with distance rather than shimmering)
        float ashLine(float t, float w) {
          float fw = max(fwidth(t), 1e-5);
          float d = min(fract(t), 1.0 - fract(t));
          return (1.0 - smoothstep(w - fw * 0.5, w + fw * 0.5, d)) * min(1.0, 2.0 * w / fw);
        }`).replace("#include <color_fragment>",`#include <color_fragment>
        {
          ashX = 0.7 + vAshP.x * uAshScale;               // mm from the burn line
          ashQ = vec3(uBurn + ashX, vAshP.y, vAshP.z);     // the cigarette's frame
          vec3 rq = vec3(ashQ.x, ashQ.yz * 0.23);          // (round it, about one unit)
          float a = atan(ashQ.z, -ashQ.y);
          float lay = en(vec3(ashQ.x * 1.7 + 0.8 * en(ashQ * 0.7), rq.yz * 0.9));
          float ring = ashLine(ashQ.x * 0.43 + 0.7 * en(ashQ * vec3(0.35, 0.9, 0.9) + 7.0), 0.03) * smoothstep(0.4, 0.62, en(vec3(ashQ.x * 0.4, rq.yz * 1.6 + 3.0)));
          float lon = ashLine(a * 0.7958 + 0.25 * en(ashQ * vec3(0.5, 0.9, 0.9) + 11.0), 0.012) * smoothstep(0.45, 0.7, en(vec3(ashQ.x * 0.6 + 5.0, rq.yz * 1.3))) * smoothstep(2.4, 3.3, length(ashQ.yz));
          ashCrack = max(ring, lon);
          ashPore = smoothstep(0.6, 0.85, en(ashQ * 7.0)) * (1.0 - smoothstep(0.04, 0.12, fwidth(ashQ.x)));
          float lump = en(ashQ * 1.8 + 3.0);
          ashH = 0.06 * lump + 0.03 * lay - 0.08 * ashCrack - 0.03 * ashPore;
          // (linear: pale grey #9a9895 to near-white #d9d7d3; charcoal #1f1d1b at the base)
          vec3 c = mix(vec3(0.32, 0.31, 0.3), vec3(0.69, 0.68, 0.65), smoothstep(0.2, 0.9, lay)) * (0.88 + 0.16 * lump);
          c *= 1.0 - 0.6 * ashCrack - 0.3 * ashPore;
          c = mix(vec3(0.014, 0.013, 0.012), c, smoothstep(0.15, 3.6, ashX));
          diffuseColor.rgb = c;
          diffuseColor.a *= uFade;
        }`).replace("#include <normal_fragment_maps>",`#include <normal_fragment_maps>
        {
          // (bumped by the height above, through its screen-space slope)
          vec3 dpx = dFdx(-vViewPosition);
          vec3 dpy = dFdy(-vViewPosition);
          vec2 dH = vec2(dFdx(ashH), dFdy(ashH));
          vec3 r1 = cross(dpy, normal);
          vec3 r2 = cross(normal, dpx);
          float det = dot(dpx, r1) * faceDirection;
          normal = normalize(abs(det) * normal - sign(det) * (dH.x * r1 + dH.y * r2));
        }`).replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
        // the ember glowing through the cracks and pores near the base
        totalEmissiveRadiance += emberGlow(ashQ * 1.3, uTime, uEmber - 1.0) * (ashCrack * 3.2 + ashPore * 0.9 + 0.3) * exp(-max(ashX, 0.0) / 1.3) * (2.2 + 6.0 * uEmber) * uLit * uFade;`)};let o=d.onBeforeCompile;d.onBeforeCompile=m=>{o(m),m.fragmentShader=m.fragmentShader.replace("#include <opaque_fragment>",`#include <opaque_fragment>
#ifdef OPAQUE
gl_FragColor.a = 1.0 + uLit;
#endif`)},d.customProgramCacheKey=()=>"cig-ash";let y=new Ze({color:5913119,roughness:.85});return{body:r,bodyDepth:p,ember:i,ash:d,tobacco:y,u}}function Cr(a){let e=new $s({depthPacking:Is});return e.onBeforeCompile=s=>{Object.assign(s.uniforms,{uBurn:a.uBurn,uSeed:a.uSeed}),s.vertexShader=s.vertexShader.replace("#include <common>",`#include <common>
attribute float aAlong;
attribute float aAround;
varying float vAlong;
varying float vAround;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vAlong = aAlong;
vAround = aAround;`),s.fragmentShader=s.fragmentShader.replace("#include <common>",`#include <common>
varying float vAlong; varying float vAround; uniform float uBurn; uniform float uSeed;`).replace("void main() {",`void main() {
        float a = vAround * 6.2831853;
        if (uBurn + 0.42 * sin(a * 3.0 + uSeed * 6.0) + 0.27 * sin(a * 7.0 + 0.4 + uSeed) + 0.15 * sin(a * 13.0 + uSeed * 3.0) - vAlong < 0.0) discard;`)},e.customProgramCacheKey=()=>"cig-depth",e}function An(a){return Vr([[0,.35],[3.25,.35],[3.42,.21],[3.6,.05],[3.8,.02],[3.88,.12],[3.9,.32],[3.9,2],...Array.from({length:41},(e,s)=>[3.9,2+s*2]),[3.9,84],[2.6,84],[0,84]],a)}function kn(a){let e=new La([[0,-.6],[3.93,-.6],[3.95,-.15],[3.92,.35],[3.82,.75],[3.45,1.1],[2.7,1.5],[1.4,1.9],[0,2]].map(([s,r])=>new q(s,r)),a);return e.rotateZ(-Math.PI/2),e}function Dn(a){let e=xe.ashMax,s=90,r=a+1,u=[],p=[],i=y=>-.0055*(y+.7)*(y+.7);for(let y=0;y<=s;y++){let v=y/s*e,T=Math.min(1,v/1.6),V=.935+.065*T*T*(3-2*T);for(let M=0;M<=a;M++){let L=M/a*Math.PI*2,C=.035*Math.sin(v*2.4+1.7*Math.sin(L*2+v*.3))+.09*Ce(v*.9,Math.cos(L)*2,Math.sin(L)*2)+.05*Ce(v*2.3+4,Math.cos(L)*4,Math.sin(L)*4),U=Math.max(0,(v-(e-2.6))/2.6),B=Math.sqrt(Math.max(0,1-U*U*(.92+.08*Ce(L*2,3,1)))),k=(4.03+C)*(.25+.75*B)*V;u.push(v,Math.cos(L)*k*-1+i(v),Math.sin(L)*k)}}for(let y=0;y<s;y++)for(let m=0;m<a;m++){let v=y*r+m,T=v+r;p.push(v,T,v+1,v+1,T,T+1)}let d=u.length/3;u.push(e+.05,i(e+.05),0);for(let y=0;y<a;y++)p.push(s*r+y,d,s*r+y+1);let o=new ft;return o.setAttribute("position",new js(u,3)),o.setIndex(p),o.computeVertexNormals(),o}function Fn(){let a=[],e=11,s=()=>(e=e*16807%2147483647)/2147483647;for(let u=0;u<7;u++){let p=s()*Math.PI*2,i=3.2+s()*.6,d=[];for(let o=0;o<=5;o++){let y=o/5,m=i+y*(.4+s()*.5),v=p+y*(s()-.5)*.8;d.push(new g(-.6+y*(1.2+s()*1.4),-Math.cos(v)*m,Math.sin(v)*m))}a.push(new Ba(new Ca(d),10,.07+s()*.05,5,!1))}let r=zr(a);for(let u of a)u.dispose();return r}function zr(a){let e=0,s=0;for(let m of a)e+=m.attributes.position.count,s+=m.index.count;let r=new Float32Array(e*3),u=new Float32Array(e*3),p=new Float32Array(e*2),i=new Uint32Array(s),d=0,o=0;for(let m of a){r.set(m.attributes.position.array,d*3),u.set(m.attributes.normal.array,d*3),p.set(m.attributes.uv.array,d*2);let v=m.index.array;for(let T=0;T<v.length;T++)i[o+T]=v[T]+d;d+=m.attributes.position.count,o+=v.length}let y=new ft;return y.setAttribute("position",new ae(r,3)),y.setAttribute("normal",new ae(u,3)),y.setAttribute("uv",new ae(p,2)),y.setIndex(new ae(i,1)),y}function Vn(a){let s=new Ca([new g(0,0,0),new g(12,.2,.3),new g(22,1,1.8),new g(28,2.4,4.4),new g(31,3,6.4)]),r=new Ba(s,60,xe.radius,a,!1),u=r.attributes.position,p=r.attributes.uv,i=new Float32Array(u.count),d=new Float32Array(u.count),o=new g;for(let y=0;y<u.count;y++){let m=p.getX(y);i[y]=m*31,d[y]=p.getY(y);let v=Math.max(0,(m-.62)/.38);s.getPointAt(Math.min(1,m),o);let T=u.getY(y)-o.y;u.setY(y,o.y+T*(1-.55*v))}return r.setAttribute("aAlong",new ae(i,1)),r.setAttribute("aAround",new ae(d,1)),r.computeVertexNormals(),{geometry:r,end:s.getPointAt(1),endDir:s.getTangentAt(1)}}function Cn(){let a=new Ks(42,2.1,2.1,84,2,2),e=a.attributes.position;for(let s=0;s<e.count;s++){let r=e.getY(s),u=e.getZ(s),p=Math.max(Math.abs(r),Math.abs(u));if(p>0){let i=Math.hypot(r,u),d=1.05/Math.max(i,1e-6),o=.35;e.setY(s,r*(1-o)+r*d*o*(p/1.05)),e.setZ(s,u*(1-o)+u*d*o*(p/1.05))}}return a.translate(21,0,0),a.computeVertexNormals(),a}function zn(){let a=new Xs(1,1,.28,9,1),e=a.attributes.position;for(let s=0;s<e.count;s++){let r=e.getX(s),u=e.getZ(s),p=Math.atan2(u,r),i=.75+.35*Ce(Math.cos(p)*1.7,Math.sin(p)*1.7,5);e.setX(s,r*i),e.setZ(s,u*i*.8),e.setY(s,e.getY(s)+.08*Ce(r*2,1,u*2))}return a.computeVertexNormals(),a}var zt=512,In=30,Lr=`
uniform sampler3D uCurl;
vec3 curl(vec3 p) { return texture(uCurl, p * 0.125).xyz; }
`,Ln=`
uniform float uTime;
uniform sampler2D uHist;       // rows: 0 emitter (xyz, alive), 1 pointer (xyz, strength), 2 pointer velocity (xyz), puff
uniform float uHistHead;       // the current slot
uniform vec3 uViewDir;         // camera forward (for the pointer's swirl axis)
uniform float uCalm;           // 1, or less when motion is reduced
${Lr}
vec4 hist(float row, float t) {
  // t: seconds ago; (the history is a ring, read with linear filtering along it)
  float slot = uHistHead - t * ${In.toFixed(1)};
  return texture2D(uHist, vec2((mod(slot, ${zt.toFixed(1)}) + 0.5) / ${zt.toFixed(1)}, (row + 0.5) / 3.0));
}
// the velocity of smoke at p that left the ember at time tb and is now a seconds old
vec3 flow(vec3 p, float tb, float a, float seed) {
  float tt = tb + a;
  float ago = uTime - tt;
  // buoyant rise, slowing as it mixes with the air
  vec3 v = vec3(0.0, 24.0 * exp(-a * 0.42) + 5.0, 0.0);
  // laminar for the first few centimetres, then unstable: the plume's own eddies (shared by every
  // strand, so they rise as one stream), then each strand's finer detail (so they part)
  float turb = smoothstep(0.75, 2.3, a) * uCalm;
  v += curl(p * 0.035 + vec3(0.0, -tt * 0.09, 0.0)) * (6.5 * turb);
  v += curl(p * 0.065 + vec3(seed * 3.7, -tt * 0.15, seed * 2.3)) * (2.4 * turb * turb);
  // the room's slow drift, and now and then a slow eddy across it
  vec2 dd = vec2(cos(tt * 0.031 + 0.8), sin(tt * 0.031 + 0.8));
  float gust = pow(max(0.0, sin(tt * 0.11 + 1.3 * sin(tt * 0.037))), 8.0);
  v.xz += (dd * (1.1 + 0.7 * sin(tt * 0.07)) + vec2(-dd.y, dd.x) * gust * 5.0) * mix(0.35, 1.0, turb);
  // the pointer, where it was then: a swirl round it and a push along its motion
  vec4 ptr = hist(1.0, ago);
  vec4 pv = hist(2.0, ago);
  if (ptr.w > 0.001) {
    vec3 r = p - ptr.xyz;
    float fall = exp(-dot(r, r) / 420.0);
    v += ptr.w * fall * (pv.xyz * 0.5 + cross(uViewDir, r) * 3.0);
  }
  // a flick shakes it
  return v * (1.0 + 0.6 * pv.w * turb);
}
// where the smoke that left the ember "age" seconds ago is now (steps shorter where it is fast and
// where the instability starts)
vec3 advect(float age, float seed, out vec3 vel) {
  float tb = uTime - age;
  vec3 p = hist(0.0, age).xyz;
  vel = vec3(0.0, 1.0, 0.0);
  float a0 = 0.0;
  for (int i = 1; i <= STEPS; i++) {
    float f = float(i) / float(STEPS);
    float a1 = age * f * sqrt(f);
    vel = flow(p, tb, 0.5 * (a0 + a1), seed);
    p += vel * (a1 - a0);
    a0 = a1;
  }
  return p;
}
// the instability: a sideways wave that grows a few centimetres up and travels up the stream
vec3 sway(float tb, float age) {
  float A = 4.0 * smoothstep(0.4, 1.4, age) * (0.55 + 0.45 * sin(tb * 0.23 + 1.0)) * uCalm;
  float ph = tb * 9.4 + 1.6 * sin(tb * 0.31) + 0.9 * sin(tb * 0.83 + 2.0);
  float th = tb * 0.17 + 0.8 * sin(tb * 0.11);
  return vec3(cos(th), 0.0, sin(th)) * (A * sin(ph));
}
`;function Br(a,e){let s=a*(e+1)*2,r=new Float32Array(s),u=new Float32Array(s),p=new Float32Array(s),i=[],d=0;for(let y=0;y<a;y++){let m=y/a+.37*Math.sin(y*12.9898);for(let v=0;v<=e;v++){for(let T of[-1,1])r[d]=v/e,u[d]=T,p[d]=m,d++;if(v<e){let T=(y*(e+1)+v)*2;i.push(T,T+1,T+2,T+1,T+3,T+2)}}}let o=new ft;return o.setAttribute("aS",new ae(r,1)),o.setAttribute("aSide",new ae(u,1)),o.setAttribute("aSeed",new ae(p,1)),o.setAttribute("position",new ae(new Float32Array(s*3),3)),o.setIndex(i),o.boundingSphere=new Va(new g,1e5),o}function Ur(a){let e=new Float32Array(a*4),s=7,r=()=>(s=s*16807%2147483647)/2147483647;for(let p=0;p<a*4;p++)e[p]=r();let u=new ft;return u.setAttribute("aSeed",new ae(e,4)),u.setAttribute("position",new ae(new Float32Array(a*3),3)),u.boundingSphere=new Va(new g,1e5),u}var Bn=`
uniform vec3 uRimPos;      // the cool back light (a narrow spot): where it is, where it points, its cone
uniform vec3 uRimDir;
uniform vec2 uRimCone;     // (cos of the outer angle, cos of the inner)
uniform vec3 uKeyPos;
uniform vec3 uCam;
uniform float uBright;
uniform vec3 uEmberPos;
uniform float uEmberI;
// the light the smoke here sends towards the eye: mostly the back light, scattered forwards
// (Henyey-Greenstein: smoke lit from behind glows), a little of the key, the ember's own glow
vec3 smokeLight(vec3 p) {
  vec3 v = normalize(uCam - p);
  vec3 toP = normalize(p - uRimPos);
  float cone = smoothstep(uRimCone.x, uRimCone.y, dot(toP, uRimDir));
  float hg = 0.6156 / pow(1.3844 - 1.24 * dot(toP, v), 1.5);
  float hk = 0.91 / pow(1.09 - 0.6 * dot(normalize(p - uKeyPos), v), 1.5);
  vec3 e = p - uEmberPos;
  float ember = uEmberI / (1.0 + dot(e, e) * 0.04);
  return (vec3(0.75, 0.84, 1.0) * cone * hg * 0.36 + vec3(1.0, 0.82, 0.62) * hk * 0.05 + vec3(1.0, 0.42, 0.12) * ember * 0.5 + vec3(0.008, 0.01, 0.014)) * uBright;
}
`,Un=`
uniform sampler2D uDepthZ;  // the scene's linear depth (mm) at the smoke's own resolution
uniform vec2 uRes;          // the smoke target's size
// soft against the scene: fades out as it nears whatever is behind it, gone behind it
float depthFade(float viewZ) {
  float scene = texture2D(uDepthZ, gl_FragCoord.xy / uRes).r;
  return clamp((scene - viewZ) / 4.0, 0.0, 1.0);
}
float h1(float n) { return fract(sin(n) * 43758.5453); }
float vnoise(vec2 x) {
  vec2 i = floor(x); vec2 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  float n = i.x + i.y * 57.0;
  return mix(mix(h1(n), h1(n + 1.0), f.x), mix(h1(n + 57.0), h1(n + 58.0), f.x), f.y);
}
`;function On(a,e){let s=e,r={transparent:!0,depthTest:!1,depthWrite:!1,blending:vo,blendSrc:rt,blendDst:Aa,blendSrcAlpha:rt,blendDstAlpha:Aa},u=new Se({defines:{STEPS:a.smokeSteps,STRANDS:a.strands.toFixed(1),SEGMENTS:a.segments.toFixed(1)},uniforms:s,vertexShader:`
      attribute float aS;
      attribute float aSide;
      attribute float aSeed;
      uniform float uLife;
      uniform float uPx;         // pixels per mm at 1 mm distance (in the smoke target)
      ${Ln}
      ${Bn}
      varying float vSide;
      varying float vB;
      varying float vAlpha;
      varying vec3 vLight;
      varying float vViewZ;
      varying float vSeed;
      varying float vTwist;
      void main() {
        float age = pow(aS, 1.25) * uLife + 0.0005;
        float tb = uTime - age;
        vec3 vel;
        vec3 p = advect(age, aSeed, vel) + sway(tb, age);
        // the next vertex up the strand: the ribbon's real direction, and how far the smoke between
        // the two has been stretched (the same smoke over a longer path is thinner: where the eddies
        // stretch it, it fades; where they fold it, it gathers)
        float da = 1.25 * pow(max(aS, 0.002), 0.25) * uLife / SEGMENTS;
        vec3 vel2;
        vec3 p2 = advect(age + da, aSeed, vel2) + sway(tb - da, age + da);
        vec3 d = p2 - p;
        float len = length(d);
        float stretch = len / da;           // mm of ribbon per second of smoke
        vec3 view = normalize(uCam - p);
        vec3 T = len > 1e-4 ? d / len : normalize(vel);
        // a thread at first (always facing the eye), then a sheet that turns as it rises: seen
        // edge-on it is narrower and denser, which is what makes smoke look like smoke
        float twist = smoothstep(0.8, 2.6, age);
        vec3 face = normalize(cross(T, view) + vec3(1e-5));
        float tw = aSeed * 6.2832 + age * 0.85 + 0.8 * sin(tb * 0.37 + aSeed * 4.0);
        vec3 sheet = normalize(cross(T, vec3(cos(tw), 0.31, sin(tw))) + vec3(1e-5));
        sheet *= sign(dot(sheet, face) + 1e-4);
        vec3 across = normalize(mix(face, sheet, 0.8 * twist));
        float seen = length(across - view * dot(across, view));
        float w = mix(0.28, 4.6, smoothstep(0.25, 7.0, age)) * (0.7 + 0.6 * fract(aSeed * 7.13));
        // the stream's opacity shared between the strands; then the same smoke spread over the
        // ribbon's length and width
        float ink = (29.0 / max(stretch, 3.0)) * (0.28 / w);
        float a = (1.0 - pow(0.36, 1.0 / STRANDS)) * mix(1.0, min(ink, 0.55), smoothstep(0.3, 2.0, age)) * mix(1.0, 1.5, smoothstep(1.0, 4.0, age)) / max(seen, 0.4);
        // never under a pixel and a half wide (thinner would shimmer): the same ink, spread wider
        float vz = -(modelViewMatrix * vec4(p, 1.0)).z;
        float minW = 0.75 * max(vz, 1.0) / uPx;
        float hw = w * seen;
        a *= hw / max(hw, minW);
        p += (across * w + face * max(0.0, minW - hw)) * aSide;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        vViewZ = -mv.z;
        vSide = aSide;
        vB = tb;
        vSeed = aSeed;
        vTwist = twist;
        vec4 em = hist(0.0, age);          // was the ember alive when this left it?
        float puff = hist(2.0, age).w;
        vAlpha = a * smoothstep(0.0, 0.012, aS) * (1.0 - smoothstep(0.45, 1.0, aS)) * em.w * (1.0 + 0.8 * puff);
        vLight = smokeLight(p);
      }`,fragmentShader:`
      ${Un}
      varying float vSide;
      varying float vB;
      varying float vAlpha;
      varying vec3 vLight;
      varying float vViewZ;
      varying float vSeed;
      varying float vTwist;
      float sq(float x) { return x * x; }
      void main() {
        // across: a smooth thread near the ember; higher up, a few fine filaments that braid
        // (they travel with the smoke: they are functions of when it left the ember)
        float s = vSide;
        float thread = exp(-s * s * 3.0);
        float b = vB;
        float fil = exp(-sq((s - 0.42 * sin(b * 1.7 + vSeed * 5.0)) * 2.4))
                  + 0.8 * exp(-sq((s + 0.5 * sin(b * 1.1 + vSeed * 3.0 + 1.0)) * 3.2))
                  + 0.6 * exp(-sq((s - 0.15 * cos(b * 2.6 + vSeed * 7.0)) * 5.0));
        fil = min(fil, 1.3) * (1.0 - s * s);
        float prof = mix(thread, fil, vTwist);
        // along: denser and thinner stretches, carried up with it
        float along = 0.55 + 0.45 * vnoise(vec2(b * 3.1 + vSeed * 9.0, s * 1.3 + vSeed * 3.0));
        float a = vAlpha * prof * mix(1.0, along, vTwist);
        a *= depthFade(vViewZ);
        if (a < 0.0015) discard;
        // bluish where thin, greyer where dense
        vec3 col = vLight * mix(vec3(0.9, 0.94, 1.0), vec3(0.97), clamp(a * 3.0, 0.0, 1.0));
        gl_FragColor = vec4(col * a, a);
      }`,side:Xt,...r}),p=new Te(Br(a.strands,a.segments),u);p.frustumCulled=!1;let i=new Se({defines:{STEPS:Math.max(4,a.smokeSteps-4),HAZE_K:(900/a.haze).toFixed(3)},uniforms:s,vertexShader:`
      attribute vec4 aSeed;
      uniform float uHazeLife;
      uniform float uPx;
      ${Ln}
      ${Bn}
      varying float vAlpha;
      varying vec3 vLight;
      varying float vViewZ;
      varying vec2 vSeed;
      void main() {
        // (the haze starts a little way up, where the stream has already broken up)
        float age = mod(uTime + aSeed.x * uHazeLife, uHazeLife) + 3.6;
        float tb = uTime - age;
        vec3 vel;
        vec3 p = advect(age, aSeed.y * 1.3, vel) + sway(tb, age);
        // the plume diffusing into the room: each mote drifts out from it as it rises
        float th = aSeed.z * 6.2832;
        vec3 dir = vec3(cos(th), (aSeed.w - 0.5) * 0.7, sin(th)) * sqrt(fract(aSeed.w * 7.31 + aSeed.z));
        p += dir * (4.0 + 3.4 * (age - 3.6));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        vViewZ = -mv.z;
        float size = mix(18.0, 50.0, smoothstep(3.6, 15.6, age)) * (0.7 + 0.6 * fract(aSeed.z * 13.7));
        gl_PointSize = size * uPx / vViewZ;
        float life = (age - 3.6) / uHazeLife;
        vAlpha = 0.0028 * HAZE_K * smoothstep(0.0, 0.3, life) * (1.0 - smoothstep(0.45, 1.0, life)) * hist(0.0, age).w;
        vLight = smokeLight(p);
        vSeed = aSeed.zw;
      }`,fragmentShader:`
      ${Un}
      varying float vAlpha;
      varying vec3 vLight;
      varying float vViewZ;
      varying vec2 vSeed;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float r2 = dot(c, c) * 4.0;
        if (r2 > 1.0) discard;
        // a soft blob, its edge eaten by noise: never a circle
        // (eaten by noise all the way in: wisps, never a disc)
        float n = vnoise(c * 2.6 + vSeed * 40.0) * 0.6 + vnoise(c * 5.5 + vSeed.yx * 40.0) * 0.4;
        float a = vAlpha * (1.0 - r2) * (1.0 - r2) * smoothstep(0.3, 0.8, n);
        a *= depthFade(vViewZ);
        if (a < 0.0008) discard;
        vec3 col = vLight * vec3(0.9, 0.94, 1.0);
        gl_FragColor = vec4(col * a, a);
      }`,...r}),d=new Zs(Ur(a.haze),i);return d.frustumCulled=!1,{ribbons:p,haze:d,dispose:()=>[p.geometry,d.geometry,u,i].forEach(o=>o.dispose())}}var ca=class{constructor(){this.data=new Uint16Array(zt*3*4),this.tex=new Jo(this.data,zt,3,Ko,yt),this.tex.wrapS=wo,this.tex.wrapT=zs,this.tex.magFilter=this.tex.minFilter=yo,this.tex.needsUpdate=!0,this.slot=0,this.t=0}fill(e,s){for(let r=0;r<zt;r++)this.write(r,e,s,null,0,null);this.tex.needsUpdate=!0}write(e,s,r,u,p,i,d=0){let o=this.data,y=qs.toHalfFloat,m=e*4;o[m]=y(s[0]),o[m+1]=y(s[1]),o[m+2]=y(s[2]),o[m+3]=y(r),m=(zt+e)*4,u&&(o[m]=y(u[0]),o[m+1]=y(u[1]),o[m+2]=y(u[2])),o[m+3]=y(p),m=(2*zt+e)*4,o[m]=y(i?i[0]:0),o[m+1]=y(i?i[1]:0),o[m+2]=y(i?i[2]:0),o[m+3]=y(d)}advance(e,s,r,u,p,i,d=0){this.t+=e*In;let o=!1;for(;this.t>=1;)this.t-=1,this.slot=(this.slot+1)%zt,this.write(this.slot,s,r,u,p,i,d),o=!0;return this.write(this.slot,s,r,u,p,i,d),(o||p>0||d>0)&&(this.tex.needsUpdate=!0),this.slot}dispose(){this.tex.dispose()}};xt.lights_physical_pars_fragment.includes("+ 0.08 );")||(xt.lights_physical_pars_fragment=xt.lights_physical_pars_fragment.replaceAll("float alpha = pow2( roughness ); // UE4's roughness","float alpha = min( 1.0, pow2( roughness ) + 0.08 );"));xt.lights_fragment_end.includes("(only the ember blooms)")||(xt.lights_fragment_end+=`
// (only the ember blooms)
reflectedLight.directSpecular = min( reflectedLight.directSpecular, vec3( 2.2 ) );
#ifdef USE_CLEARCOAT
clearcoatSpecularDirect = min( clearcoatSpecularDirect, vec3( 2.2 ) );
#endif
`);mn();var es={high:{name:"high",dpr:2,strands:10,segments:160,haze:1800,smokeSteps:10,smokeScale:.5,dof:!0,bloomReal:!0,bloomScale:.5,shadow:2048,msaa:4,smaa:!0,fps:60,trayH:.6,segs:64,lighterH:.5,flameShadow:!0,shimmer:!0},medium:{name:"medium",dpr:1.5,strands:8,segments:120,haze:1100,smokeSteps:8,smokeScale:.5,dof:!1,bloomReal:!1,bloomScale:.35,shadow:1024,msaa:4,smaa:!0,fps:60,trayH:.75,segs:48,lighterH:.62,flameShadow:!1,shimmer:!1},low:{name:"low",dpr:1,strands:6,segments:80,haze:500,smokeSteps:6,smokeScale:.25,dof:!1,bloomReal:!1,bloomScale:.25,shadow:1024,msaa:2,smaa:!1,fps:30,trayH:.9,segs:32,lighterH:.75,flameShadow:!1,shimmer:!1}},Gn=["high","medium","low"];function Ir(){let a=navigator,e=a.userAgent||"",s=/Android|iPhone|iPad|iPod|Mobile/i.test(e)||a.maxTouchPoints>1&&/Macintosh/.test(e),r="";try{let m=document.createElement("canvas").getContext("webgl2"),v=m&&m.getExtension("WEBGL_debug_renderer_info");r=m?String(m.getParameter(v?v.UNMASKED_RENDERER_WEBGL:m.RENDERER)):"",m?.getExtension("WEBGL_lose_context")?.loseContext()}catch{r=""}let u=a.deviceMemory||8,p=a.hardwareConcurrency||4,i=/SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(r),d=/Intel\(R\) (HD|UHD) Graphics( [2-6]\d\d)?\b|Mali-[GT][0-7]\d\b|Adreno \(TM\) [3-5]\d\d|PowerVR|Apple A(9|10|11)/i.test(r),o=s?"medium":"high";return(d||u<=4||p<=4)&&(o=s?"low":"medium"),(i||u<=2)&&(o="low"),{tier:o,mobile:s}}var Or=`
.cg-root{position:absolute;inset:0;overflow:hidden;color:#d9d4cc;font:500 12.5px/1.4 -apple-system,BlinkMacSystemFont,Inter,'Segoe UI',Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.cg-poster{position:absolute;left:50%;top:0;height:100%;width:auto;min-width:100%;max-width:none;object-fit:cover;transform:translateX(-50%);pointer-events:none}
.cg-stage{position:absolute;inset:0;opacity:0;transition:opacity .8s ease}
.cg-ready .cg-stage{opacity:1}
.cg-lost .cg-stage,.cg-fallback .cg-stage{opacity:0}
.cg-canvas{display:block;width:100%;height:100%;touch-action:none}
.cg-ui{transition:opacity .5s}
.cg-root:not(.cg-ready) .cg-ui,.cg-fallback .cg-ui{opacity:0;pointer-events:none}
.cg-hint{position:absolute;top:max(16px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);margin:0;padding:6px 13px;border-radius:999px;color:rgba(230,224,214,.62);background:rgba(28,26,24,.42);border:1px solid rgba(255,255,255,.07);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);white-space:nowrap;pointer-events:none;letter-spacing:.02em;transition:opacity .8s;max-width:calc(100% - 220px);overflow:hidden;text-overflow:ellipsis}
.cg-hint.gone{opacity:0}
.cg-tools{position:absolute;right:max(16px,env(safe-area-inset-right));top:max(16px,env(safe-area-inset-top));display:flex;gap:9px}
.cg-root button{font:inherit;cursor:pointer;color:inherit}
.cg-round{width:40px;height:40px;padding:0;border-radius:50%;display:grid;place-items:center;background:rgba(32,30,28,.45);border:1px solid rgba(255,255,255,.08);-webkit-backdrop-filter:blur(14px) saturate(1.3);backdrop-filter:blur(14px) saturate(1.3);box-shadow:0 4px 18px rgba(0,0,0,.35);transition:transform .15s,background .2s}
.cg-round:hover{transform:scale(1.06);background:rgba(44,42,40,.55)}
.cg-round:active{transform:scale(.94)}
.cg-round:focus-visible{outline:2px solid #e8a868;outline-offset:2px}
.cg-round svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.cg-round[aria-pressed='false'] .on,.cg-round[aria-pressed='true'] .off{display:none}
.cg-flame{position:absolute;left:50%;bottom:max(22px,calc(env(safe-area-inset-bottom) + 10px));width:64px;height:64px;padding:0;border-radius:50%;display:grid;place-items:center;background:rgba(32,30,28,.5);border:1px solid rgba(255,255,255,.1);-webkit-backdrop-filter:blur(14px) saturate(1.3);backdrop-filter:blur(14px) saturate(1.3);box-shadow:0 4px 18px rgba(0,0,0,.4);opacity:0;visibility:hidden;transform:translate(-50%,10px) scale(.92);transition:opacity .2s,transform .2s,visibility 0s .2s,background .12s,border-color .12s,box-shadow .12s;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}
.cg-lighter .cg-flame{opacity:1;visibility:visible;transform:translate(-50%,0) scale(1);transition:opacity .2s,transform .2s,visibility 0s,background .12s,border-color .12s,box-shadow .12s}
.cg-flame svg{width:26px;height:26px;fill:rgba(240,200,150,.85);transition:fill .12s,transform .12s}
.cg-flame[aria-pressed='true']{background:rgba(255,128,40,.3);border-color:rgba(255,178,104,.75);box-shadow:0 0 0 3px rgba(255,150,70,.18),0 0 28px rgba(255,130,40,.5)}
.cg-flame[aria-pressed='true'] svg{fill:#ffd9a0;transform:scale(.9)}
.cg-flame:focus-visible{outline:2px solid #e8a868;outline-offset:3px}
@container cg (max-width: 720px){.cg-hint{white-space:normal;text-align:center;width:max-content;border-radius:12px;left:max(16px,env(safe-area-inset-left));transform:none;max-width:calc(100% - 132px)}}
.cg-root{container:cg/inline-size}
`,Gr=`<div class="cg-ui">
  <p class="cg-hint">drag to look around \xB7 pick up the cigarette or lighter \xB7 hold \u{1F525} or Space to light</p>
  <button class="cg-flame" data-flame aria-label="Hold to light the lighter" aria-pressed="false" aria-hidden="true" tabindex="-1"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.2 2.2c.9 3.6 5.6 6.2 5.6 11.6a5.8 5.8 0 0 1-11.6 0c0-3.2 1.8-4.9 3-6.7.3 2 1.2 3.3 2.4 3.8-.6-3.4.3-6.3.6-8.7z"/></svg></button>
  <div class="cg-tools">
    <button class="cg-round" data-act="sound" aria-label="Sound" aria-pressed="false" title="Sound">
      <svg class="off" viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>
      <svg class="on" viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/></svg>
    </button>
    <button class="cg-round" data-act="reset" aria-label="Reset view" title="Reset view"><svg viewBox="0 0 24 24"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/></svg></button>
  </div>
</div>`;function Ci(a,e={}){let s=new URLSearchParams(location.search),r={quality:s.get("quality")||e.quality||"auto",poster:e.poster??null,debug:e.debug??s.has("debug"),workerUrl:e.workerUrl,dynres:s.get("dynres")!=="0"&&e.dynamicResolution!==!1},u=matchMedia("(prefers-reduced-motion: reduce)").matches,p=!1,i=[],d=(U,B,k,l)=>{U.addEventListener(B,k,l),i.push(()=>U.removeEventListener(B,k,l))},o={},y={destroy:C,ready:null,get quality(){return o.tier||null}},m,v=performance.now(),T=[],V=()=>globalThis.scheduler?.yield?globalThis.scheduler.yield():new Promise(U=>setTimeout(U,0)),M=()=>v=performance.now();return y.ready=L().catch(U=>{p||console.error("still life:",U),m?.classList.add("cg-fallback")}),y;async function L(){let U=performance.now(),B=t=>{let c=performance.now();T.push({step:t,ms:c-U}),U=c};getComputedStyle(a).position==="static"&&(a.style.position="relative"),m=document.createElement("div"),m.className="cg-root";let k=document.createElement("style");if(k.textContent=Or,m.appendChild(k),r.poster){let t=document.createElement("img");t.className="cg-poster",t.alt="",t.src=r.poster,m.appendChild(t)}let l=document.createElement("div");l.className="cg-stage",m.appendChild(l),m.insertAdjacentHTML("beforeend",Gr),a.appendChild(m);let S=Ir(),E=!es[r.quality],R={...es[E?S.tier:r.quality]};o.tier=R.name;let f;try{f=new an({antialias:!1,powerPreference:"high-performance"})}catch{m.classList.add("cg-fallback");return}let P=1,Z=()=>Math.min(window.devicePixelRatio||1,R.dpr);f.setPixelRatio(Z()),f.outputColorSpace=Fa,f.toneMapping=Cs,f.toneMappingExposure=1,f.shadowMap.enabled=!0,f.shadowMap.type=Ds,f.shadowMap.autoUpdate=!1;let X=f.domElement;X.className="cg-canvas",X.setAttribute("role","img"),X.setAttribute("aria-label","A cigarette burning in a hand-thrown stoneware ashtray on a dark walnut table, its smoke curling up through a beam of light."),l.appendChild(X);let n=(()=>{try{return new Worker(r.workerUrl,{type:"module"})}catch{return null}})();n&&i.push(()=>n.terminate());let pe=0,O=new Map;n&&(n.onmessage=t=>{O.get(t.data.id)?.(t.data),O.delete(t.data.id)});let j=t=>n?new Promise(c=>{let h=++pe;O.set(h,c),n.postMessage({...t,id:h})}):Promise.reject(new Error("no worker")),J=j({type:"tray",h:R.trayH}),D=j({type:"bake"}),$=j({type:"curl"}),I=j({type:"lighter",h:R.lighterH}),N=new Qo;N.fog=new Ns(0,.0011);let H=new en(24,1,6,5e3);function te(){let t=new Qo;t.background=new Ve(.006,.006,.007);let c=new Jt(1,1),h=(ye,Y,nt,Kt,Qt)=>{let et=new $o({color:new Ve(...Qt).multiplyScalar(Kt),side:Xt}),Rt=new Te(c,et);return Rt.scale.set(ye,Y,1),Rt.position.set(...nt),Rt.lookAt(0,0,0),t.add(Rt),et},w=[h(500,2600,[-1700,1500,900],2.4,[1,.88,.76]),h(1800,260,[700,1600,-1800],.7,[.7,.8,1])],b=new on(f),z=b.fromScene(t,0,10,6e3).texture;b.dispose(),c.dispose();for(let ye of w)ye.dispose();return z}B("renderer");let he=te();B("environment (PMREM)"),await V(),N.environment=he,N.environmentIntensity=.55;let oe=[0,1,2].map(t=>Hn(t));function Oe(t,c){let h=oe[t],w=new g(-h.dir[0],0,-h.dir[2]),b=le.degToRad(4.5),z=w.clone().multiplyScalar(Math.cos(b)).add(new g(0,-Math.sin(b),0)).normalize(),ye=ke.bowlTop+2.3,Kt=new g(h.dir[0]*ye,h.y+xe.radius+.05,h.dir[2]*ye).clone().addScaledVector(z,-35),Qt=new g(0,1,0),et=new g().crossVectors(z,Qt).normalize(),Rt=new g().crossVectors(et,z).normalize();return c.makeBasis(z,Rt,et).setPosition(Kt),c}let fe=(await D).tex;if(B("textures baked (worker)"),p)return;let ze=Math.min(8,f.capabilities.getMaxAnisotropy()),De=[];function ve(t,c,h,w=!0){let b=new Jo(c,t.size,t.size);return w&&(b.wrapS=b.wrapT=wo),b.magFilter=yo,b.minFilter=Ls,b.generateMipmaps=!0,b.anisotropy=ze,h&&(b.colorSpace=Fa),b.needsUpdate=!0,De.push(b),b}let x={walnut:ve(fe.walnut,fe.walnut.px,!0),walnutN:ve(fe.walnut,fe.walnut.nrm,!1),walnutR:ve(fe.walnut,fe.walnut.rough,!1),speckle:ve(fe.speckle,fe.speckle.px,!1),cork:ve(fe.cork,fe.cork.px,!0),paper:ve(fe.paper,fe.paper.px,!1),fibre:ve(fe.fibre,fe.fibre.px,!1),bead:ve(fe.bead,fe.bead.px,!1)},G={uTime:{value:0},uEmber:{value:1},uFlame:{value:0}},Q=new Ze({map:x.walnut,normalMap:x.walnutN,roughnessMap:x.walnutR,roughness:1,clearcoat:.22,clearcoatRoughness:.32,normalScale:new q(.6,.6)});for(let t of[x.walnut,x.walnutN,x.walnutR])t.repeat.set(6,6);Q.onBeforeCompile=t=>{t.vertexShader=t.vertexShader.replace("#include <common>",`#include <common>
varying vec3 vWp;`).replace("#include <worldpos_vertex>",`#include <worldpos_vertex>
vWp = (modelMatrix * vec4(transformed, 1.0)).xyz;`),t.fragmentShader=t.fragmentShader.replace("#include <common>",`#include <common>
varying vec3 vWp;`).replace("#include <fog_fragment>",`gl_FragColor.rgb *= smoothstep(470.0, 150.0, length(vWp.xz));
#include <fog_fragment>`)};let se=new Te(new Jt(2400,2400).rotateX(-Math.PI/2),Q);se.receiveShadow=!0,N.add(se);let Le=new Ze({color:16777215,roughness:.6,clearcoat:1,clearcoatRoughness:.06,vertexColors:!0});Le.onBeforeCompile=t=>{t.uniforms.tSpeck={value:x.speckle},t.uniforms.uFloor={value:ke.floor},t.vertexShader=t.vertexShader.replace("#include <common>",`#include <common>
attribute vec2 aZone;
varying vec2 vZone;
varying vec3 vOP;
varying vec3 vON;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vZone = aZone;
vOP = position;
vON = normal;`),t.fragmentShader=t.fragmentShader.replace("#include <common>",`#include <common>
          varying vec2 vZone; varying vec3 vOP; varying vec3 vON;
          uniform sampler2D tSpeck; uniform float uFloor;
          float trayInterior; float trayRaw; float trayDust; float trayPool;
          vec4 triplanar(sampler2D t, vec3 p, vec3 n, float s) {
            vec3 w = pow(abs(n), vec3(4.0)); w /= dot(w, vec3(1.0));
            return texture2D(t, p.yz * s) * w.x + texture2D(t, p.zx * s) * w.y + texture2D(t, p.xy * s) * w.z;
          }`).replace("#include <color_fragment>",`#include <color_fragment>
          vec4 sp = triplanar(tSpeck, vOP, normalize(vON), 0.022);
          vec4 sp2 = triplanar(tSpeck, vOP, normalize(vON), 0.09);
          trayInterior = vZone.x;
          trayRaw = vZone.y;
          float r = length(vOP.xz);
          // the inner glaze pools deeper and glassier towards the floor; it thins and breaks amber over the rim
          trayPool = smoothstep(uFloor + 9.0, uFloor + 0.5, vOP.y);
          float thin = smoothstep(26.0, 31.5, vOP.y) * (1.0 - trayPool);
          vec3 inner = mix(vec3(0.075, 0.052, 0.04), vec3(0.028, 0.022, 0.02), trayPool);
          inner = mix(inner, vec3(0.32, 0.19, 0.09), thin * (0.45 + 0.4 * sp.g));
          // outside: warm grey, mottled, iron speckles
          vec3 outer = vec3(0.47, 0.44, 0.405) * (0.88 + 0.22 * sp.g);
          outer = mix(outer, vec3(0.2, 0.12, 0.07), clamp(sp2.r * 1.1, 0.0, 1.0));
          vec3 raw = vec3(0.6, 0.5, 0.39) * (0.85 + 0.25 * sp2.b);
          vec3 c = mix(outer, inner, trayInterior);
          c = mix(c, raw, trayRaw);
          // fine ash dust settled on the floor of the bowl: thickest a little off centre, specks
          // and soot smudges, thinning out towards the walls
          float dens = smoothstep(27.0, 5.0, length(vOP.xz - vec2(4.0, -3.0))) * (0.4 + 0.6 * smoothstep(0.3, 0.72, sp.g));
          float specks = smoothstep(0.6, 0.8, sp2.b);
          trayDust = trayInterior * smoothstep(uFloor + 2.4, uFloor + 0.4, vOP.y) * clamp(dens * 0.5 + specks * dens * 0.55, 0.0, 0.8);
          vec3 dustCol = mix(vec3(0.34, 0.33, 0.32), vec3(0.11, 0.1, 0.095), smoothstep(0.55, 0.8, sp2.g));
          c = mix(c, dustCol, trayDust);
          diffuseColor.rgb = c * vColor.rgb;`).replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
          roughnessFactor = mix(0.62 + 0.06 * sp2.b, mix(0.2, 0.07, trayPool), trayInterior);
          roughnessFactor = mix(roughnessFactor, 0.94, max(trayRaw, trayDust));`).replace("#include <lights_physical_fragment>",`#include <lights_physical_fragment>
          material.clearcoat = trayInterior * (1.0 - trayDust) * (1.0 - trayRaw);`).replace(/TRAY_BOTTOM/g,ke.bowlBottom.toFixed(1))},Le.customProgramCacheKey=()=>"tray";let W=new ea(16766638,2.8,0,.42,.95,0);W.castShadow=!0,W.shadow.mapSize.set(R.shadow,R.shadow),W.shadow.camera.near=150,W.shadow.camera.far=900,W.shadow.bias=-4e-4,W.shadow.normalBias=.6,W.shadow.radius=5,N.add(W,W.target);let de=new ea(11125503,1.4,0,.22,.6,0);N.add(de,de.target);let Ge=new Js(2240578,788486,.09);N.add(Ge);for(let t of[W,de,Ge])t.layers.enableAll();W.shadow.autoUpdate=!1;let A=null;R.flameShadow&&(A=new ea(xo,0,420,1.3,.6,2),A.castShadow=!0,A.shadow.mapSize.set(1024,1024),A.shadow.camera.near=3,A.shadow.camera.far=420,A.shadow.bias=-6e-4,A.shadow.normalBias=.5,A.shadow.radius=4,A.shadow.autoUpdate=!1,A.layers.enableAll(),A.position.set(0,200,0),N.add(A,A.target)),await V();let ue=await J;if(B("materials; ashtray meshed (worker)"),p)return;let Me=ue.mesh,Ie=new ft;Ie.setAttribute("position",new ae(Me.positions,3)),Ie.setAttribute("normal",new ae(Me.normals,3));let Ne=new Float32Array(Me.ao.length*3);for(let t=0;t<Me.ao.length;t++)Ne[t*3]=Ne[t*3+1]=Ne[t*3+2]=.45+.55*Me.ao[t];Ie.setAttribute("color",new ae(Ne,3)),Ie.setAttribute("aZone",new ae(Me.zone,2)),Ie.setIndex(new ae(Me.indices,1));let tt=new Te(Ie,Le);tt.castShadow=tt.receiveShadow=!0,N.add(tt),await V();let ao=An(R.segs),_t=kn(R.segs),Mo=Dn(R.segs),ha=Fn(),ce=[0,1].map(t=>{let c=Ja(x,G);c.u.uSeed.value=.3+t*.37;let h=new Dt;h.matrixAutoUpdate=!1;let w=new Te(ao,c.body);w.castShadow=w.receiveShadow=!0,w.customDepthMaterial=c.bodyDepth,w.layers.enable(Et.REGION);let b=new Dt,z=new Te(_t,c.ember),ye=new Te(Mo,c.ash);ye.position.x=.7,ye.castShadow=ye.receiveShadow=!0;let Y=new Te(ha,c.tobacco);b.add(z,ye,Y);for(let nt of[z,ye,Y])nt.layers.set(Et.REGION);return h.add(w,b),N.add(h),{group:h,body:w,burn:b,ember:z,ash:ye,mats:c,notch:t,b:64.5,ashLen:13,fallAt:15,lit:1,fade:t===0?1:0,state:t===0?"burning":"waiting",after:"unlit",lightProg:1,scorch:0,filterScorch:0,coal:1}}),Ro=new Ue;function Ht(t,c){t.notch=c,Oe(c,Ro),t.group.matrix.copy(Ro),t.group.matrixWorldNeedsUpdate=!0}Ht(ce[0],0),Ht(ce[1],1),ce[1].group.visible=!1;let _=0;function ie(t){t.mats.u.uBurn.value=t.b,t.mats.u.uLit.value=t.lit,t.mats.u.uFade.value=t.fade,t.mats.u.uLightProg.value=t.lightProg,t.mats.u.uScorch.value=t.scorch,t.mats.u.uFilterScorch.value=t.filterScorch,t.burn.position.x=t.b>xe.length?xe.length+.1:t.b,t.ember.scale.x=.25+.75*t.coal,t.ash.scale.x=Math.max(.001,t.ashLen/xe.ashMax),t.mats.u.uAshScale.value=t.ash.scale.x,t.ash.visible=t.ashLen>.05;let c=t.fade<.999;for(let h of[t.mats.body,t.mats.ash])h.transparent=c;t.ember.visible=t.fade>.01&&(t.lit>.01||t.lightProg>0)}B("cigarettes"),await V();let ne=Ja(x,{uTime:G.uTime,uEmber:{value:0}});ne.u.uBurn.value=29.6,ne.u.uLit.value=0;let Be=Vn(R.segs),me=new Te(Be.geometry,ne.body);me.customDepthMaterial=ne.bodyDepth,me.castShadow=me.receiveShadow=!0;let ge=new Te(new za(3.1,3),new Ze({color:2762532,roughness:.96}));{let t=ge.geometry.attributes.position;for(let c=0;c<t.count;c++){let h=t.getX(c),w=t.getY(c),b=t.getZ(c),z=1+.22*Ce(h*.9,w*.9+2,b*.9);t.setXYZ(c,h*z*.75,w*z*.55,b*z)}ge.geometry.computeVertexNormals(),ge.position.copy(Be.end).addScaledVector(Be.endDir,-.4)}let He=new Dt;He.add(me,ge),He.position.set(-6,ke.floor+xe.radius-.15,16),He.rotation.set(0,2.55,-.05),N.add(He);let Fe=new Ze({color:13149562,roughness:.78});Fe.onBeforeCompile=t=>{t.vertexShader=t.vertexShader.replace("#include <common>",`#include <common>
varying float vX;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vX = position.x;`),t.fragmentShader=t.fragmentShader.replace("#include <common>",`#include <common>
varying float vX;`).replace("#include <color_fragment>",`#include <color_fragment>
float ch = smoothstep(20.0, 39.0, vX);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.008, 0.006, 0.005), ch);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.107, 0.033, 0.01), smoothstep(14.0, 20.0, vX) * (1.0 - ch) * 0.7);`)};let qe=new Te(Cn(),Fe),pt=new za(1.6,3);{let t=pt.attributes.position;for(let c=0;c<t.count;c++){let h=t.getX(c),w=t.getY(c),b=t.getZ(c),z=1+.2*Ce(h*1.4+3,w*1.4,b*1.4);t.setXYZ(c,h*1.35*z+42.4,w*z,b*z)}pt.computeVertexNormals()}let gt=new Te(pt,new Ze({color:1841689,roughness:.9,sheen:.4,sheenColor:new Ve(.35,.34,.33)})),Ke=new Dt;Ke.add(qe,gt);for(let t of[qe,gt])t.castShadow=t.receiveShadow=!0;Ke.position.set(-21,ke.floor+1.08,-2),Ke.rotation.set(0,.42,.035),N.add(Ke),B("butt, match"),await V();let je=48,So=new Ze({color:7236455,roughness:.97}),Pt=new Ys(zn(),So,je);Pt.instanceMatrix.setUsage(Os),Pt.frustumCulled=!1,N.add(Pt);for(let t of[Q,Le,ne.body,ge.material,Fe,gt.material,So,...ce.flatMap(c=>[c.mats.body,c.mats.ash,c.mats.tobacco])])qa(t);let F={p:new Float32Array(je*3),v:new Float32Array(je*3),q:Array.from({length:je},()=>new Ee),w:new Float32Array(je*3),s:new Float32Array(je),awake:new Uint8Array(je),used:new Uint8Array(je),next:0},ts=new Ue,ua=new g,so=new Ee,ma=new g,Nn=new Gt;function os(t){ma.set(F.p[t*3],F.p[t*3+1],F.p[t*3+2]),ua.setScalar(F.used[t]?F.s[t]:0),ts.compose(ma,F.q[t],ua),Pt.setMatrixAt(t,ts)}{let t=3,c=()=>(t=t*16807%2147483647)/2147483647;for(let h=0;h<9;h++){let w=c()*Math.PI*2,b=6+c()*20;F.p.set([Math.cos(w)*b,ke.floor+.25,Math.sin(w)*b],h*3),F.q[h].setFromEuler(new Gt(c()*.2,c()*6.28,c()*.2)),F.s[h]=.8+c()*1.2,F.used[h]=1}F.next=9;for(let h=0;h<je;h++)os(h)}let fa=.25;function no(t,c,h,w){let b=oo(t,c,h);w[0]=oo(t+fa,c,h)-b,w[1]=oo(t,c+fa,h)-b,w[2]=oo(t,c,h+fa)-b;let z=Math.hypot(w[0],w[1],w[2])||1;return w[0]/=z,w[1]/=z,w[2]/=z,b}let Qe=new Float64Array(3),ro=0;function qn(t){if(!ro)return!1;ro=0;for(let c=0;c<je;c++){if(!F.awake[c])continue;let h=c*3;F.v[h+1]-=9810*.32*t;let w=Math.exp(-t*4);F.v[h]*=w,F.v[h+1]*=w,F.v[h+2]*=w,F.p[h]+=F.v[h]*t,F.p[h+1]+=F.v[h+1]*t,F.p[h+2]+=F.v[h+2]*t;let b=no(F.p[h],F.p[h+1],F.p[h+2],Qe),z=!1;if(b<.25){let Y=.25-b;F.p[h]+=Qe[0]*Y,F.p[h+1]+=Qe[1]*Y,F.p[h+2]+=Qe[2]*Y;let nt=F.v[h]*Qe[0]+F.v[h+1]*Qe[1]+F.v[h+2]*Qe[2];nt<0&&(F.v[h]-=1.15*nt*Qe[0],F.v[h+1]-=1.15*nt*Qe[1],F.v[h+2]-=1.15*nt*Qe[2]),z=!0}F.p[h+1]<.15&&(F.p[h+1]=.15,F.v[h+1]<0&&(F.v[h+1]*=-.1),z=!0),z&&(F.v[h]*=.6,F.v[h+2]*=.6,F.w[h]*=.5,F.w[h+1]*=.5,F.w[h+2]*=.5,so.setFromUnitVectors(ua.set(0,1,0).applyQuaternion(F.q[c]),ma.set(Qe[0],Qe[1],Qe[2])),F.q[c].premultiply(so.slerp(so.identity(),.85))),so.setFromEuler(Nn.set(F.w[h]*t,F.w[h+1]*t,F.w[h+2]*t)),F.q[c].premultiply(so);let ye=Math.abs(F.v[h])+Math.abs(F.v[h+1])+Math.abs(F.v[h+2]);z&&ye<6?F.awake[c]=0:ro++,os(c)}return Pt.instanceMatrix.needsUpdate=!0,!0}let _o=new g;function da(t,c){let h=Math.max(3,Math.round(t.ashLen*.7));for(let w=0;w<h;w++){let b=F.next;F.next=(F.next+1)%je;let z=t.b+.5+w/h*t.ashLen;_o.set(z,(Math.random()-.5)*3,(Math.random()-.5)*3).applyMatrix4(t.group.matrix),F.p.set([_o.x,_o.y,_o.z],b*3),F.v.set([(Math.random()-.5)*60+c[0],-40-Math.random()*60+c[1],(Math.random()-.5)*60+c[2]],b*3),F.w.set([(Math.random()-.5)*12,(Math.random()-.5)*12,(Math.random()-.5)*12],b*3),F.q[b].setFromEuler(new Gt(Math.random()*3,Math.random()*3,Math.random()*3)),F.s[b]=.9+Math.random()*1.3,F.used[b]=1,F.awake[b]=1,ro++}t.ashLen=0,t.fallAt=12+Math.random()*5}B("flakes");let jn=(await I).mesh;if(B("lighter meshed (worker)"),p)return;let qt=new g,pa=new g,Ho=!1,Po=new g;function as(t,c){if(!Ho)return c.set(0,1,0),1e9;Po.subVectors(pa,qt);let h=le.clamp(c.subVectors(t,qt).dot(Po)/Po.lengthSq(),0,1);c.subVectors(t,qt).addScaledVector(Po,-h);let w=c.length();return c.divideScalar(w||1),w-xe.radius}let ct={on:!1,foot:new g,filter:new g,filterOn:!1,axis:new g(1,0,0)},Yn=a.clientHeight>a.clientWidth*1.1?{x:148,z:-72,theta:1.2}:{x:65,z:60,theta:2.62},ee=Rn({mesh:jn,tex:x,U:G,sdf:oo,sdfGrad:no,groundGrad:Wn,cigCapsule:as,target:ct,onIgnite:()=>wt.click(),rest:Yn});ee.group.traverse(t=>t.isMesh&&t.layers.enable(Et.REGION)),N.add(ee.group);for(let t of ee.group.children)t.material?.isMeshPhysicalMaterial&&qa(t.material);let Ao=new g,Zn=new g;function Wn(t,c,h,w){let b=no(t,c,h,w),z=as(Zn.set(t,c,h),Ao);return z<b?(w[0]=Ao.x,w[1]=Ao.y,w[2]=Ao.z,z):b}let ss=new Ue,ns=new Ue,Xe=new g,ko=new g,Do=(t,c,h)=>{let w=Math.abs(t)-12+3.5,b=Math.abs(c)-31+3.5,z=Math.abs(h)-6+3.5;return Math.hypot(Math.max(w,0),Math.max(b,0),Math.max(z,0))+Math.min(Math.max(w,b,z),0)-3.5};function Kn(t,c,h,w){Xe.set(t,c,h).applyMatrix4(ss);let b=Do(Xe.x,Xe.y,Xe.z);if(b>30)return b;let z=.2;return ko.set(Do(Xe.x+z,Xe.y,Xe.z)-b,Do(Xe.x,Xe.y+z,Xe.z)-b,Do(Xe.x,Xe.y,Xe.z+z)-b).applyMatrix4(ns).normalize(),w[0]=ko.x,w[1]=ko.y,w[2]=ko.z,b}let Fo=new Float64Array(3);function Qn(t,c,h,w){let b=no(t,c,h,w),z=Kn(t,c,h,Fo);return z<b?(w[0]=Fo[0],w[1]=Fo[1],w[2]=Fo[2],z):b}function rs(){ss.copy(ee.group.matrix).invert(),ns.extractRotation(ee.group.matrix)}rs();let Vo=(await $).curl;if(B("curl volume (worker)"),p)return;let ot=new Gs(Vo.data,Vo.size,Vo.size,Vo.size);ot.format=Ko,ot.type=yt,ot.wrapS=ot.wrapT=ot.wrapR=wo,ot.minFilter=ot.magFilter=yo,ot.unpackAlignment=1,ot.needsUpdate=!0,De.push(ot);let io=new ca,be=new g,at={uTime:G.uTime,uHist:{value:io.tex},uHistHead:{value:0},uViewDir:{value:new g},uCalm:{value:u?.35:1},uLife:{value:11},uHazeLife:{value:12},uPx:{value:500},uRimPos:{value:new g},uRimDir:{value:new g},uRimCone:{value:new q},uKeyPos:{value:new g},uCam:{value:new g},uBright:{value:1},uEmberPos:{value:new g},uEmberI:{value:1},uDepthZ:{value:null},uRes:{value:new q(1,1)},uCurl:{value:ot}},is=On(R,at);B("smoke"),await V();let Co=new Qo;Co.add(is.ribbons,is.haze);function ls(t,c){return c.set(t.b>xe.length?xe.length+.3:t.b+.9,0,0).applyMatrix4(t.group.matrix)}ls(ce[0],be),io.fill([be.x,be.y,be.z],1);let Ye={target:new g,pos:new g};{let t=be;Ye.target.set(t.x*.6,t.y+18,t.z*.6);let c=oe[0],h=Math.atan2(c.dir[2],c.dir[0])+le.degToRad(118),w=360,b=le.degToRad(20);Ye.pos.set(Ye.target.x+Math.cos(h)*Math.cos(b)*w,Ye.target.y+Math.sin(b)*w,Ye.target.z+Math.sin(h)*Math.cos(b)*w);let z=new g().subVectors(Ye.target,Ye.pos).setY(0).normalize(),ye=new g(z.z,0,-z.x);W.position.copy(t).addScaledVector(ye,270).addScaledVector(z,-140).add(new g(0,310,0)),W.target.position.set(0,10,0),de.position.copy(t).addScaledVector(z,300).addScaledVector(ye,-60).add(new g(0,62,0)),de.target.position.copy(t).add(new g(0,50,0)),W.target.updateMatrixWorld(),de.target.updateMatrixWorld()}at.uRimPos.value.copy(de.position),at.uRimDir.value.subVectors(de.target.position,de.position).normalize(),at.uRimCone.value.set(Math.cos(de.angle),Math.cos(de.angle*(1-de.penumbra))),at.uKeyPos.value.copy(W.position);let Pe=new sa(H,X);Pe.enableDamping=!0,Pe.dampingFactor=.07,Pe.minDistance=70,Pe.maxDistance=420,Pe.minPolarAngle=le.degToRad(8),Pe.maxPolarAngle=le.degToRad(86),Pe.enablePan=!1,Pe.rotateSpeed=.6,H.position.copy(Ye.pos),Pe.target.copy(Ye.target),Pe.update();let jt=180,zo={key:W.intensity,rim:de.intensity,fill:Ge.intensity,env:N.environmentIntensity},Lo=0;function Xn(t){let c=t==="static"||t==="ember"?1:t==="region"?2:0;for(let w of ce)w.mats.u.uPart.value=w===ce[_]?c:0;let h=t==="ember";W.intensity=h?0:zo.key,de.intensity=h?0:zo.rim,Ge.intensity=h?0:zo.fill,N.environmentIntensity=h?0:zo.env,Ya(be,H,t==="static"?0:h?1:Lo/jt,jt)}let st=hn({renderer:f,camera:H,Q:R,smokeScene:Co,SU:at,setMode:Xn}),we={still:!1,scene:N,emberI:0,dofK:0,regionBox:new bt,emberBox:new bt,smokeBox:new bt,glow:{x:.5,y:.5,r:.05,col:new g},focus:{s:300,home:300},seed:0,truth:!1},ht=new g,Re={x0:0,y0:0,x1:0,y1:0,behind:!1};function cs(){Re.x0=Re.y0=1/0,Re.x1=Re.y1=-1/0,Re.behind=!1}function hs(t){t.project(H),(t.z>1||t.z<-1)&&(Re.behind=!0);let c=t.x*.5+.5,h=t.y*.5+.5;c<Re.x0&&(Re.x0=c),c>Re.x1&&(Re.x1=c),h<Re.y0&&(Re.y0=h),h>Re.y1&&(Re.y1=h)}let Bo=t=>Math.min(1,Math.max(0,t));function us(t){return Re.behind?t.set(0,0,1,1):t.set(Bo(Re.x0),Bo(Re.y0),Bo(Re.x1),Bo(Re.y1))}function ms(t,c,h,w,b){cs();for(let z=0;z<8;z++)hs(ht.set(z&1?h:c,z&2?w:-w-1.6,z&4?w:-w).applyMatrix4(t.group.matrix));return us(b)}function $n(t,c){cs();for(let h=0;h<8;h++)hs(ht.set(t.x+(h&1?120:-120),t.y+(h&2?260:-6),t.z+(h&4?120:-120)));return us(c)}let ga=new Ve(16738852);function lo(){let t=Math.max(1,a.clientWidth),c=Math.max(1,a.clientHeight),h=Z()*P;H.aspect=t/c;let w=Math.tan(le.degToRad(12))*Math.min(H.aspect,1.25);H.fov=le.radToDeg(2*Math.atan(w/H.aspect)),H.updateProjectionMatrix(),f.setPixelRatio(h),f.setSize(t,c,!1),f.getDrawingBufferSize(va),st.setSize(va.x,va.y)}let va=new q,fs=new ResizeObserver(lo);fs.observe(a),i.push(()=>fs.disconnect()),lo();let ds=u?0:(xe.length-xe.filter)/300,Yt=0,Lt=0,wa=0;function Jn(t){let c=ce[_];if(c.state==="burning")c.lit=Math.min(1,c.lit+t/.9),c.coal=Math.min(1,c.coal+t/1.4),c.b-=ds*t,c.ashLen=Math.min(xe.ashMax,c.ashLen+ds*t*.92),c.ashLen>c.fallAt&&da(c,[0,0,0]),c.b<=xe.filter+.8&&(c.state="out",wa=0);else if(c.state==="out"&&(wa+=t,c.lit=Math.max(0,c.lit-t/1.6),wa>3.5)){let h=ce[1-_];Ht(h,(c.notch+1)%3),h.b=xe.length+3.5,h.ashLen=0,h.lit=0,h.lightProg=0,h.scorch=0,h.filterScorch=0,h.coal=0,h.fade=0,h.state="arriving",h.after="unlit",h.group.visible=!0,c.state="leaving",ba.includes(ut.held)&&ut.drop(),_=1-_,Ae.reset(h),Je=!0}for(let h of[0,1]){let w=ce[h];w.state==="arriving"?(w.fade=Math.min(1,w.fade+t/1.6),w.fade>=1&&(w.state=w.after),Je=!0):w.state==="leaving"&&(w.fade=Math.max(0,w.fade-t/1.6),w.fade<=0&&(w.state="waiting",w.group.visible=!1),Je=!0),w.group.visible&&ie(w)}}let K={x:0,y:0,inside:!1,world:new g,prev:new g,vel:new g,strength:0,has:!1},ya=new ta;ya.layers.enableAll();let ps=new q,gs=new Ft,Uo=new g;function er(t,c,h){let w=X.getBoundingClientRect();return ps.set((t-w.left)/w.width*2-1,-((c-w.top)/w.height)*2+1),ya.setFromCamera(ps,H),H.getWorldDirection(Uo),Uo.y=0,Uo.normalize(),gs.setFromNormalAndCoplanarPoint(Uo,be),ya.ray.intersectPlane(gs,h)}let Io={passive:!0};d(X,"pointermove",t=>{M(),K.x=t.clientX,K.y=t.clientY,K.inside=!0},Io),d(X,"pointerleave",()=>K.inside=!1,Io);let Oo=[0,0,0],Go=[0,0,0],No=[0,0,0];function tr(t){if(K.inside&&er(K.x,K.y,K.world)){K.has?(K.vel.subVectors(K.world,K.prev).divideScalar(Math.max(t,.001)),K.vel.length()>1500&&K.vel.setLength(1500)):K.vel.set(0,0,0),K.prev.copy(K.world),K.has=!0;let c=Math.min(1,K.vel.length()/350);K.strength+=(Math.max(c,K.strength*Math.exp(-t/1.2))-K.strength)*Math.min(1,t*8)}else K.has=!1,K.strength*=Math.exp(-t/1.2),K.vel.multiplyScalar(Math.exp(-t/.6))}d(X,"wheel",M,Io),d(window,"keydown",M),d(X,"pointerdown",()=>{M(),Es(),kt()},Io);function vs(t){let c=[0,0,0];t.ashLen>.3&&da(t,c),Lt=1,Yt=1,wt.burst(1),o.lastFlick=performance.now()}let ws=oe.map(t=>new g(t.dir[0]*(ke.bowlTop+2.3),t.y+xe.radius+.05,t.dir[2]*(ke.bowlTop+2.3))),ut=pn({canvas:X,camera:H,controls:Pe,listen:d,onActive:()=>(M(),Es(),kt())}),Ae=wn({camera:H,sdfGrad:Qn,notchPose:(t,c)=>Oe(t,c),notchSeat:t=>ws[t],onBreak:(t,c)=>{da(t,[c.x*.7,c.y*.7,c.z*.7]),Yt=1,Lt=Math.max(Lt,.6),wt.burst(.8)},onChange:()=>Je=!0});Ae.reset(ce[0]);let ba=ce.map(t=>({meshes:[t.body,t.ash,t.ember],canGrab:()=>t===ce[_]&&(t.state==="burning"||t.state==="out"||t.state==="unlit"||t.state==="lighting")&&Ae.st.mode!=="glide",pick:c=>{Ae.pick(t,c.point),o.lastPick=performance.now()},aim:c=>Ae.aim(c),twist:c=>Ae.twist(c),release:()=>t.state==="leaving"||t.state==="waiting"?null:Ae.release(),home:()=>Ae.glideTo(t.notch),cancel:()=>Ae.cancel(),onTap:()=>{t.state==="burning"&&vs(t)}}));for(let t of ba)ut.add(t);let co={meshes:ee.meshes,canGrab:()=>ee.st.mode!=="glide",pick:t=>{ee.pick(t.point),o.lastPick=performance.now()},aim:t=>ee.aim(t),twist:t=>ee.twist(t),release:()=>ee.release(),home:()=>ee.home(),cancel:()=>ee.cancel(),onTap:()=>{}};ut.add(co);let vt=m.querySelector("[data-flame]"),ys=!1,ho=-1,or=t=>{if(ut.held===co){t.preventDefault(),ho=t.pointerId;try{vt.setPointerCapture(t.pointerId)}catch{}M(),ee.ignite(!0),kt()}},xa=t=>{t.pointerId===ho&&(ho=-1,ee.ignite(!1))};d(vt,"pointerdown",or),d(vt,"pointerup",xa),d(vt,"pointercancel",xa),d(vt,"lostpointercapture",xa),d(vt,"contextmenu",t=>t.preventDefault());let Zt=!1;d(window,"keydown",t=>{t.code!=="Space"||ut.held!==co||(t.preventDefault(),!(t.repeat||Zt)&&(Zt=!0,M(),ee.ignite(!0),kt()))}),d(window,"keyup",t=>{t.code!=="Space"||!Zt||(Zt=!1,ee.ignite(!1))}),d(window,"blur",()=>{Zt=!1,ho=-1,ee.ignite(!1)});function ar(){let t=ut.held===co;t!==ys&&(ys=t,m.classList.toggle("cg-lighter",t),vt.setAttribute("aria-hidden",String(!t)),vt.tabIndex=t?0:-1,t||(Zt=!1,ho=-1));let c=t&&ee.st.want;c!==(vt.getAttribute("aria-pressed")==="true")&&vt.setAttribute("aria-pressed",String(c))}let bs=new g,wt={ctx:null,on:!1,buf:null,t:0,enable(t){if(this.on=t,t&&!this.ctx){let c=window.AudioContext||window.webkitAudioContext;if(!c)return;this.ctx=new c;let h=this.ctx.sampleRate;this.buf=this.ctx.createBuffer(1,h,h);let w=this.buf.getChannelData(0);for(let b=0;b<h;b++)w[b]=Math.random()*2-1}this.ctx&&(t&&uo?this.ctx.resume():this.ctx.suspend())},burst(t){if(!this.on||!this.ctx||this.ctx.state!=="running")return;let c=this.ctx,h=c.createBufferSource();h.buffer=this.buf;let w=c.createBiquadFilter();w.type="bandpass",w.frequency.value=2200+Math.random()*4500,w.Q.value=.8;let b=c.createGain(),z=c.currentTime,ye=(.015+Math.random()*.04)*t;b.gain.setValueAtTime(0,z),b.gain.linearRampToValueAtTime(ye,z+.002),b.gain.exponentialRampToValueAtTime(1e-4,z+.02+Math.random()*.05),h.connect(w).connect(b).connect(c.destination),h.start(z,Math.random()*.9,.09)},click(){if(!this.on||!this.ctx||this.ctx.state!=="running")return;let t=this.ctx,c=t.createBufferSource();c.buffer=this.buf;let h=t.createBiquadFilter();h.type="highpass",h.frequency.value=3200;let w=t.createGain(),b=t.currentTime;w.gain.setValueAtTime(0,b),w.gain.linearRampToValueAtTime(.32,b+7e-4),w.gain.exponentialRampToValueAtTime(1e-4,b+.012),c.connect(h).connect(w).connect(t.destination),c.start(b,Math.random()*.9,.02)},step(t){!this.on||!this.ctx||(this.t-=t,this.t<=0&&(this.t=.04+Math.random()*.22,ce[_].state==="burning"&&this.burst(.5+Math.random()*.5)))},close(){this.ctx?.close()}};i.push(()=>wt.close());let sr=m.querySelector(".cg-hint"),xs=!0;function Es(){xs&&(xs=!1,setTimeout(()=>sr.classList.add("gone"),2500))}let $e={on:!1};function nr(){ut.held&&ut.drop("home"),(Ae.st.mode==="lying"||Ae.st.mode==="fall")&&Ae.glideTo(ce[_].notch),ee.home(),$e.on=!0,$e.t0=performance.now(),$e.ms=u?1:1100,$e.p0=H.position.clone(),$e.q0=Pe.target.clone(),Pe.enableDamping=!1}function rr(t){if(!$e.on)return;let c=Math.min(1,(t-$e.t0)/$e.ms),h=c<.5?4*c*c*c:1-Math.pow(-2*c+2,3)/2;H.position.lerpVectors($e.p0,Ye.pos,h),Pe.target.lerpVectors($e.q0,Ye.target,h),c>=1&&($e.on=!1,Pe.enableDamping=!0)}for(let t of m.querySelectorAll("[data-act]"))d(t,"click",()=>{if(M(),t.dataset.act==="reset")nr();else if(t.dataset.act==="sound"){let c=t.getAttribute("aria-pressed")!=="true";t.setAttribute("aria-pressed",String(c)),wt.enable(c)}kt()});let uo=!0,qo=!0,Bt=0,jo=performance.now(),Ts=0,Je=!0,Ea=0,Wt=0,Ms=!1,Rs=1e3/R.fps,At={sum:0,n:0,good:0},Ss=!0,Yo=0,_s=0,Ta=0,Ma=new Ue,Ra=new Ue,Hs=(t,c)=>{for(let h=0;h<16;h++)if(Math.abs(t.elements[h]-c.elements[h])>1e-5*Math.max(1,Math.abs(t.elements[h])))return!1;return!0},ir=9e3,Ut={emberLight:1,flameLight:1,cache:1,truth:0,freeze:0},Mt=null;r.debug&&import("./ember-overlay-OPFBF3FI.js").then(t=>{p||(Mt=t.createOverlay(m,f,()=>({tier:o.tier,scale:P,targets:st.targets.length+(R.bloomReal?11:0)+2}),T),o.firstFrameAt&&(Mt.stats.firstFrameAt=o.firstFrameAt,Mt.report()))});function kt(){!Bt&&uo&&Ms&&!p&&(Bt=requestAnimationFrame(Zo))}let lr=t=>.82+.1*Math.sin(t*1.3)+.07*Ce(t*2.7,.5,.5)+.05*Ce(t*9,3.1,.2),Sa=9e3,mo=new g,_a=new g,fo={x:0,y:0,k:0,r:.1},po={x:0,y:0,r:.05,col:new g},Ha=0;function cr(t){t.state="burning",t.b=xe.length+.4,t.lit=.5,t.coal=0,t.lightProg=1,t.ashLen=0,t.fallAt=12+Math.random()*5,Lt=1,Yt=.8,wt.burst(.9),o.lastLit=performance.now(),Je=!0}function Ps(){f.shadowMap.needsUpdate=!0,W.shadow.needsUpdate=!0}function Zo(t){if(Bt=0,!uo||p)return;let c=t-v>ir&&!$e.on;if((R.fps<60||c)&&t-Ts<1e3/30-2){Bt=requestAnimationFrame(Zo);return}let h=performance.now(),w=Math.min(.05,(t-jo)/1e3);jo=t,Ut.freeze&&(w=0),Ts=t,Wt+=w*(u?.35:1),G.uTime.value=Wt,rr(t),Pe.update(),ut.hover();let b=ce[_];Ho=b.group.visible&&b.state!=="leaving"&&b.state!=="waiting",Ho&&(qt.set(0,0,0).applyMatrix4(b.group.matrix),pa.set(Math.min(xe.length,b.b+.7+b.ashLen),0,0).applyMatrix4(b.group.matrix)),ct.on=Ho&&b.state!=="arriving"&&(Ae.st.mode==="rest"||Ae.st.mode==="lying"),ct.on&&(ct.filterOn=b.state==="unlit"||b.state==="lighting",ct.filter.copy(qt),ct.axis.subVectors(pa,qt).normalize(),ct.foot.set(b.b>xe.length?xe.length:b.b+.7+b.ashLen,0,0).applyMatrix4(b.group.matrix));let z=ee.update(w,Wt);rs(),ar();let ye=Ae.update(w,ce[_].state==="burning");Jn(w),qn(w),tr(w),wt.step(w),Yt=Math.max(0,Yt-w/1.1),Lt=Math.max(0,Lt-w/2.2);let Y=ce[_],nt=!1,Kt=0;if(ee.st.lit>0&&ct.on){let mt=xe.radius+3.2;(Y.state==="unlit"||Y.state==="lighting")&&ee.flameDist(ct.foot)<mt&&(nt=!0,Y.state="lighting",Y.scorch=Math.min(1,Y.scorch+w/.8),Y.lightProg=Math.min(1,Y.lightProg+w/1.5),Y.lightProg>=1&&cr(Y)),ee.flameDist(ct.filter)<mt&&(Y.filterScorch=Math.min(1,Y.filterScorch+w/2.5)),Y.state==="burning"&&(Kt=1-le.smoothstep(ee.flameDist(be),5,24))}Y.state==="lighting"&&!nt&&(Y.lightProg=Math.max(0,Y.lightProg-w/2),Y.lightProg<=0&&(Y.state="unlit")),Ha+=(Kt-Ha)*Math.min(1,w*5);let Qt=Y.state==="lighting"?.45*Y.lightProg:Y.lit;G.uEmber.value=lr(Wt)+.9*Yt+.7*Ae.st.fan+.9*Ha,bs.copy(be),ls(Y,be),Ae.st.mode==="held"&&w>0&&(K.world.copy(be),K.vel.subVectors(be,bs).divideScalar(w),K.vel.length()>1500&&K.vel.setLength(1500),K.strength=Math.max(K.strength*Math.exp(-w/1.2),Math.min(1,K.vel.length()/350))),Lo=jt*G.uEmber.value*Qt*Y.fade*Ut.emberLight,H.updateMatrixWorld(),Ya(be,H,Lo/jt,jt);let et=ee.st;et.lit>0?(ee.flamePoints(),mo.copy(ee.flameBase).addScaledVector(et.flameDir,Math.min(7,et.flameLen*.35)),_a.set(ee.group.matrix.elements[12],0,ee.group.matrix.elements[14]),ja(mo,_a,H,et.glow*Ut.flameLight,Sa,A?0:1,A),A&&(A.shadow.needsUpdate=!0,f.shadowMap.needsUpdate=!0)):ja(mo,_a,H,0,Sa,0,A),No[0]=be.x,No[1]=be.y,No[2]=be.z,Oo[0]=K.world.x,Oo[1]=K.world.y,Oo[2]=K.world.z,Go[0]=K.vel.x,Go[1]=K.vel.y,Go[2]=K.vel.z;let Rt=Y.state==="leaving"||Y.state==="waiting"?0:Qt*Y.fade;at.uHistHead.value=io.advance(w,No,Rt,Oo,K.strength,Go,Lt),at.uEmberPos.value.copy(be),at.uEmberI.value=G.uEmber.value*Rt,H.getWorldDirection(at.uViewDir.value),at.uCam.value.copy(H.position),H.updateMatrixWorld();let ur=Ss||!Hs(Ma,H.matrixWorld)||!Hs(Ra,H.projectionMatrix);Ss=!1,(ye||z)&&(Je=!0);let ks=ye||z||ur||$e.on||ro>0||ce.some(mt=>mt.state==="arriving"||mt.state==="leaving")||!Ut.cache;Ta=ks?0:Ta+1;let Pa=ks||Ta<4;Ea+=w,_s+=w;let Wo=Ea>2;if(Wo&&(Ea=0),we.focus.s=H.position.distanceTo(be),we.focus.home=Ye.pos.distanceTo(be),Mt?.begin(),Pa?(Yo=0,st.valid=!1,Ma.copy(H.matrixWorld),Ra.copy(H.projectionMatrix),(Je||Wo)&&(Ps(),Je=!1)):((!st.valid||Je||Wo)&&(W.shadow.needsUpdate=!0,st.bake(N,we.focus,Je||Wo||!st.valid),Ma.copy(H.matrixWorld),Ra.copy(H.projectionMatrix),Je=!1,_s=0,Mt&&Mt.bakes++),Yo=Math.min(1,Yo+w/.4)),we.still=!Pa,we.truth=!!Ut.truth,we.emberI=Lo/jt,we.dofK=Yo,Ut.freeze||(we.seed=(we.seed+.6180339)%7),ms(Y,Y.b-4.6,Y.b+.7+Y.ashLen+.8,4.7,we.regionBox),ms(Y,Y.b-1.2,Y.b+3.8,4.7,we.emberBox),$n(be,we.smokeBox),R.bloomReal||(ht.copy(be).project(H),we.glow.x=ht.x*.5+.5,we.glow.y=ht.y*.5+.5,we.glow.r=7/(2*we.focus.s*Math.tan(le.degToRad(H.fov/2))),we.glow.col.set(ga.r,ga.g,ga.b).multiplyScalar(.3*we.emberI)),we.shim=null,we.flameGlow=null,we.time=Wt,et.lit>0){let mt=1/(2*H.position.distanceTo(mo)*Math.tan(le.degToRad(H.fov/2)));R.shimmer&&(ht.copy(ee.flameTip).project(H),fo.x=ht.x*.5+.5,fo.y=ht.y*.5+.5,fo.k=et.lit,fo.r=24*mt,we.shim=fo),R.bloomReal||(ht.copy(mo).project(H),po.x=ht.x*.5+.5,po.y=ht.y*.5+.5,po.r=10*mt,po.col.set(xo.r,xo.g,xo.b).multiplyScalar(.2*et.glow),we.flameGlow=po)}if(st.render(we),Mt?.end(performance.now()-h,Pa?"full":"cached"),r.dynres&&(At.sum+=w*1e3,++At.n>=45)){let mt=At.sum/At.n;At.sum=At.n=0,mt>Rs*1.2&&P>.6?(P=P>.9?.85:P>.8?.72:.6,lo()):mt<Rs*1.05&&P<1&&++At.good>=6&&(P=P<.65?.72:P<.8?.85:1,At.good=0,lo())}kt()}function go(t){t!==uo&&(uo=t,t?(jo=performance.now(),wt.enable(wt.on),kt()):(Bt&&cancelAnimationFrame(Bt),Bt=0,wt.ctx?.suspend()))}let As=new IntersectionObserver(t=>{qo=t[t.length-1].isIntersecting,go(qo&&!document.hidden)});As.observe(a),i.push(()=>As.disconnect()),d(document,"visibilitychange",()=>go(qo&&!document.hidden)),d(X,"webglcontextlost",t=>{t.preventDefault(),go(!1),m.classList.add("cg-lost")}),d(X,"webglcontextrestored",()=>{he.dispose(),he=te(),N.environment=he,Je=!0,io.tex.needsUpdate=!0,ot.needsUpdate=!0,st.valid=!1,m.classList.remove("cg-lost"),go(qo&&!document.hidden)});for(let t of ce)ie(t);let hr=performance.now();if(ce[1].group.visible=!0,B("post, controls, sound, loop"),await V(),H.layers.enableAll(),ee.group.traverse(t=>t.material?.isShaderMaterial&&(t.visible=!0)),f.setRenderTarget(st.live),await f.compileAsync(N,H),H.layers.set(0),await f.compileAsync(Co,H),f.setRenderTarget(null),ce[1].group.visible=!1,!p){if(Ps(),Zo(performance.now()),await V(),Zo(performance.now()),o.compileMs=performance.now()-hr,B("shaders compiled, first frame"),o.firstFrameAt=performance.now(),m.classList.add("cg-ready"),Ms=!0,jo=performance.now(),kt(),E){let t=performance.now(),c=0;await new Promise(b=>{let z=()=>{c++,performance.now()-t>1600||p?b():requestAnimationFrame(z)};requestAnimationFrame(z)});let h=(performance.now()-t)/Math.max(1,c),w=Gn.indexOf(o.tier);if(h>1e3/60*1.35&&w<2){let b=es[Gn[w+1]];o.tier=b.name,R.dpr=b.dpr,R.fps=b.fps,R.smokeScale=b.smokeScale,R.bloomScale=b.bloomScale,R.dof=b.dof,R.bloomReal=R.bloomReal&&b.bloomReal,R.smaa=b.smaa,lo()}}r.debug&&(window.__still={THREE:St,scene:N,camera:H,renderer:f,controls:Pe,cigs:ce,api:o,handle:y,flick:()=>vs(ce[_]),emberWorld:be,ptr:K,SU:at,frameCache:st,Q:R,key:W,rim:de,fill:Ge,tableMat:Q,trayMat:Le,flags:Ut,homePos:Ye.pos,homeTarget:Ye.target,pickup:Ae,grab:ut,seatPts:ws,traySdfGrad:no,lighter:ee,lighterItem:co,cigItems:ba,lightTarget:ct,flameSpot:A,FLAME_CD:Sa,get cur(){return ce[_]},setTime:t=>Wt=t,burnTo:t=>{ce[_].b=t,st.valid=!1,Je=!0},get overlay(){return Mt}}),o.dispose=()=>{go(!1),Pe.dispose();let t=new Set;for(let c of[N,Co])c.traverse(h=>{h.geometry&&!t.has(h.geometry)&&t.add(h.geometry)&&h.geometry.dispose();let w=Array.isArray(h.material)?h.material:h.material?[h.material]:[];for(let b of w)t.has(b)||t.add(b)&&b.dispose()});for(let c of De)c.dispose();io.dispose(),he.dispose(),W.shadow.dispose(),st.dispose(),f.dispose(),f.forceContextLoss(),Mt?.dispose()}}}function C(){if(!p){p=!0;try{o.dispose?.()}finally{for(let U of i.splice(0))U();m?.remove(),window.__still?.handle===y&&delete window.__still}}}}export{es as TIERS,Ci as createScene,Ir as guessTier};
