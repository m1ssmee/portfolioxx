import{$ as Wo,B as We,C as bt,D as Xa,E as Ke,F as io,G as zt,H as pe,I as Qa,J as lo,K as $a,L as oe,M as Ja,N as Yo,O as tt,P as yt,Q as co,R as ho,S as Te,T as uo,U as es,V as ts,W as os,X as as,Y as ss,Z as qo,_ as Zo,a as ht,aa as Ko,b as ut,ba as Xo,c as Ia,ca as Qo,d as ro,da as ye,e as Oa,ea as Ne,f as Na,fa as rs,g as Io,ga as ns,h as Oo,ha as is,i as No,ia as $o,j as ja,ja as mo,k as Ct,ka as Jo,l as Ga,la as ls,m as jo,ma as Ye,n as Ft,na as cs,o as Ya,oa as hs,p as qa,pa as ot,q as je,qa as us,r as no,ra as fo,s as Za,t as Wa,u as Go,v as Ka,w as te,x as L,y as Ge,z as b}from"./ember-chunk-G43SKIYH.js";import"./ember-chunk-LNKPV2WA.js";var ms={type:"change"},ta={type:"start"},ds={type:"end"},po=new co,fs=new yt,ar=Math.cos(70*te.DEG2RAD),he=new b,Me=2*Math.PI,q={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},ea=1e-6,go=class extends ls{constructor(e,s=null){super(e,s),this.state=q.NONE,this.target=new b,this.cursor=new b,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:ht.ROTATE,MIDDLE:ht.DOLLY,RIGHT:ht.PAN},this.touches={ONE:ut.ROTATE,TWO:ut.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle="auto",this._domElementKeyEvents=null,this._lastPosition=new b,this._lastQuaternion=new Ge,this._lastTargetPosition=new b,this._quat=new Ge().setFromUnitVectors(e.up,new b(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new Jo,this._sphericalDelta=new Jo,this._scale=1,this._panOffset=new b,this._rotateStart=new L,this._rotateEnd=new L,this._rotateDelta=new L,this._panStart=new L,this._panEnd=new L,this._panDelta=new L,this._dollyStart=new L,this._dollyEnd=new L,this._dollyDelta=new L,this._dollyDirection=new b,this._mouse=new L,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=rr.bind(this),this._onPointerDown=sr.bind(this),this._onPointerUp=nr.bind(this),this._onContextMenu=fr.bind(this),this._onMouseWheel=cr.bind(this),this._onKeyDown=hr.bind(this),this._onTouchStart=ur.bind(this),this._onTouchMove=mr.bind(this),this._onMouseDown=ir.bind(this),this._onMouseMove=lr.bind(this),this._interceptControlDown=dr.bind(this),this._interceptControlUp=pr.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}set cursorStyle(e){this._cursorStyle=e,e==="grab"?this.domElement.style.cursor="grab":this.domElement.style.cursor="auto"}get cursorStyle(){return this._cursorStyle}connect(e){super.connect(e),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.ownerDocument.addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.state=q.NONE,this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.ownerDocument.removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.ownerDocument.removeEventListener("keyup",this._interceptControlUp,{capture:!0}),this._controlActive=!1,this._pointers.length=0,this._pointerPositions={},this.domElement.style.touchAction="",this.domElement.style.cursor="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(e){e.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=e}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(ms),this.update(),this.state=q.NONE}pan(e,s){this._pan(e,s),this.update()}dollyIn(e){this._dollyIn(e),this.update()}dollyOut(e){this._dollyOut(e),this.update()}rotateLeft(e){this._rotateLeft(e),this.update()}rotateUp(e){this._rotateUp(e),this.update()}update(e=null){let s=this.object.position;he.copy(s).sub(this.target),he.applyQuaternion(this._quat),this._spherical.setFromVector3(he),this.autoRotate&&this.state===q.NONE&&this._rotateLeft(this._getAutoRotationAngle(e)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let r=this.minAzimuthAngle,l=this.maxAzimuthAngle;isFinite(r)&&isFinite(l)&&(r<-Math.PI?r+=Me:r>Math.PI&&(r-=Me),l<-Math.PI?l+=Me:l>Math.PI&&(l-=Me),r<=l?this._spherical.theta=Math.max(r,Math.min(l,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(r+l)/2?Math.max(r,this._spherical.theta):Math.min(l,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let h=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{let u=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),h=u!=this._spherical.radius}if(he.setFromSpherical(this._spherical),he.applyQuaternion(this._quatInverse),s.copy(this.target).add(he),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let u=null;if(this.object.isPerspectiveCamera){let f=he.length();u=this._clampDistance(f*this._scale);let t=f-u;this.object.position.addScaledVector(this._dollyDirection,t),this.object.updateMatrixWorld(),h=!!t}else if(this.object.isOrthographicCamera){let f=new b(this._mouse.x,this._mouse.y,0);f.unproject(this.object);let t=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),h=t!==this.object.zoom;let p=new b(this._mouse.x,this._mouse.y,0);p.unproject(this.object),this.object.position.sub(p).add(f),this.object.updateMatrixWorld(),u=he.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;u!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(u).add(this.object.position):(po.origin.copy(this.object.position),po.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(po.direction))<ar?this.object.lookAt(this.target):(fs.setFromNormalAndCoplanarPoint(this.object.up,this.target),po.intersectPlane(fs,this.target))))}else if(this.object.isOrthographicCamera){let u=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),u!==this.object.zoom&&(this.object.updateProjectionMatrix(),h=!0)}return this._scale=1,this._performCursorZoom=!1,h||this._lastPosition.distanceToSquared(this.object.position)>ea||8*(1-this._lastQuaternion.dot(this.object.quaternion))>ea||this._lastTargetPosition.distanceToSquared(this.target)>ea?(this.dispatchEvent(ms),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(e){return e!==null?Me/60*this.autoRotateSpeed*e:Me/60/60*this.autoRotateSpeed}_getZoomScale(e){let s=Math.abs(e*.01);return Math.pow(.95,this.zoomSpeed*s)}_rotateLeft(e){this._sphericalDelta.theta-=e}_rotateUp(e){this._sphericalDelta.phi-=e}_panLeft(e,s){he.setFromMatrixColumn(s,0),he.multiplyScalar(-e),this._panOffset.add(he)}_panUp(e,s){this.screenSpacePanning===!0?he.setFromMatrixColumn(s,1):(he.setFromMatrixColumn(s,0),he.crossVectors(this.object.up,he)),he.multiplyScalar(e),this._panOffset.add(he)}_pan(e,s){let r=this.domElement;if(this.object.isPerspectiveCamera){let l=this.object.position;he.copy(l).sub(this.target);let h=he.length();h*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*e*h/r.clientHeight,this.object.matrix),this._panUp(2*s*h/r.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(e*(this.object.right-this.object.left)/this.object.zoom/r.clientWidth,this.object.matrix),this._panUp(s*(this.object.top-this.object.bottom)/this.object.zoom/r.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(e,s){if(!this.zoomToCursor)return;this._performCursorZoom=!0;let r=this.domElement.getBoundingClientRect(),l=e-r.left,h=s-r.top,u=r.width,f=r.height;this._mouse.x=l/u*2-1,this._mouse.y=-(h/f)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(e){return Math.max(this.minDistance,Math.min(this.maxDistance,e))}_handleMouseDownRotate(e){this._rotateStart.set(e.clientX,e.clientY)}_handleMouseDownDolly(e){this._updateZoomParameters(e.clientX,e.clientY),this._dollyStart.set(e.clientX,e.clientY)}_handleMouseDownPan(e){this._panStart.set(e.clientX,e.clientY)}_handleMouseMoveRotate(e){this._rotateEnd.set(e.clientX,e.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let s=this.domElement;this._rotateLeft(Me*this._rotateDelta.x/s.clientHeight),this._rotateUp(Me*this._rotateDelta.y/s.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(e){this._dollyEnd.set(e.clientX,e.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.zoomToCursor&&(this._performCursorZoom=!0,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()),this.update()}_handleMouseMovePan(e){this._panEnd.set(e.clientX,e.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(e){this._updateZoomParameters(e.clientX,e.clientY),e.deltaY<0?this._dollyIn(this._getZoomScale(e.deltaY)):e.deltaY>0&&this._dollyOut(this._getZoomScale(e.deltaY)),this.update()}_handleKeyDown(e){let s=!1;switch(e.code){case this.keys.UP:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(Me*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),s=!0;break;case this.keys.BOTTOM:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(-Me*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),s=!0;break;case this.keys.LEFT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(Me*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),s=!0;break;case this.keys.RIGHT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(-Me*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),s=!0;break}s&&(e.preventDefault(),this.update())}_handleTouchStartRotate(e){if(this._pointers.length===1)this._rotateStart.set(e.pageX,e.pageY);else{let s=this._getSecondPointerPosition(e),r=.5*(e.pageX+s.x),l=.5*(e.pageY+s.y);this._rotateStart.set(r,l)}}_handleTouchStartPan(e){if(this._pointers.length===1)this._panStart.set(e.pageX,e.pageY);else{let s=this._getSecondPointerPosition(e),r=.5*(e.pageX+s.x),l=.5*(e.pageY+s.y);this._panStart.set(r,l)}}_handleTouchStartDolly(e){let s=this._getSecondPointerPosition(e),r=e.pageX-s.x,l=e.pageY-s.y,h=Math.sqrt(r*r+l*l);this._dollyStart.set(0,h)}_handleTouchStartDollyPan(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enablePan&&this._handleTouchStartPan(e)}_handleTouchStartDollyRotate(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enableRotate&&this._handleTouchStartRotate(e)}_handleTouchMoveRotate(e){if(this._pointers.length==1)this._rotateEnd.set(e.pageX,e.pageY);else{let r=this._getSecondPointerPosition(e),l=.5*(e.pageX+r.x),h=.5*(e.pageY+r.y);this._rotateEnd.set(l,h)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let s=this.domElement;this._rotateLeft(Me*this._rotateDelta.x/s.clientHeight),this._rotateUp(Me*this._rotateDelta.y/s.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(e){if(this._pointers.length===1)this._panEnd.set(e.pageX,e.pageY);else{let s=this._getSecondPointerPosition(e),r=.5*(e.pageX+s.x),l=.5*(e.pageY+s.y);this._panEnd.set(r,l)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(e){let s=this._getSecondPointerPosition(e),r=e.pageX-s.x,l=e.pageY-s.y,h=Math.sqrt(r*r+l*l);this._dollyEnd.set(0,h),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);let u=(e.pageX+s.x)*.5,f=(e.pageY+s.y)*.5;this._updateZoomParameters(u,f)}_handleTouchMoveDollyPan(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enablePan&&this._handleTouchMovePan(e)}_handleTouchMoveDollyRotate(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enableRotate&&this._handleTouchMoveRotate(e)}_addPointer(e){this._pointers.push(e.pointerId)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let s=0;s<this._pointers.length;s++)if(this._pointers[s]==e.pointerId){this._pointers.splice(s,1);return}}_isTrackingPointer(e){for(let s=0;s<this._pointers.length;s++)if(this._pointers[s]==e.pointerId)return!0;return!1}_trackPointer(e){let s=this._pointerPositions[e.pointerId];s===void 0&&(s=new L,this._pointerPositions[e.pointerId]=s),s.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){let s=e.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[s]}_customWheelEvent(e){let s=e.deltaMode,r={clientX:e.clientX,clientY:e.clientY,deltaY:e.deltaY};switch(s){case 1:r.deltaY*=16;break;case 2:r.deltaY*=100;break}return e.ctrlKey&&!this._controlActive&&(r.deltaY*=10),r}};function sr(o){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(o.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(o)&&(this._addPointer(o),o.pointerType==="touch"?this._onTouchStart(o):this._onMouseDown(o),this._cursorStyle==="grab"&&(this.domElement.style.cursor="grabbing")))}function rr(o){this.enabled!==!1&&(o.pointerType==="touch"?this._onTouchMove(o):this._onMouseMove(o))}function nr(o){switch(this._removePointer(o),this._pointers.length){case 0:this.domElement.releasePointerCapture(o.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(ds),this.state=q.NONE,this._cursorStyle==="grab"&&(this.domElement.style.cursor="grab");break;case 1:let e=this._pointers[0],s=this._pointerPositions[e];this._onTouchStart({pointerId:e,pageX:s.x,pageY:s.y});break}}function ir(o){let e;switch(o.button){case 0:e=this.mouseButtons.LEFT;break;case 1:e=this.mouseButtons.MIDDLE;break;case 2:e=this.mouseButtons.RIGHT;break;default:e=-1}switch(e){case ht.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(o),this.state=q.DOLLY;break;case ht.ROTATE:if(o.ctrlKey||o.metaKey||o.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(o),this.state=q.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(o),this.state=q.ROTATE}break;case ht.PAN:if(o.ctrlKey||o.metaKey||o.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(o),this.state=q.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(o),this.state=q.PAN}break;default:this.state=q.NONE}this.state!==q.NONE&&this.dispatchEvent(ta)}function lr(o){switch(this.state){case q.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(o);break;case q.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(o);break;case q.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(o);break}}function cr(o){this.enabled===!1||this.enableZoom===!1||this.state!==q.NONE||(o.preventDefault(),this.dispatchEvent(ta),this._handleMouseWheel(this._customWheelEvent(o)),this.dispatchEvent(ds))}function hr(o){this.enabled!==!1&&this._handleKeyDown(o)}function ur(o){switch(this._trackPointer(o),this._pointers.length){case 1:switch(this.touches.ONE){case ut.ROTATE:if(this.enableRotate===!1){this.state=q.NONE;break}this._handleTouchStartRotate(o),this.state=q.TOUCH_ROTATE;break;case ut.PAN:if(this.enablePan===!1){this.state=q.NONE;break}this._handleTouchStartPan(o),this.state=q.TOUCH_PAN;break;default:this.state=q.NONE}break;case 2:switch(this.touches.TWO){case ut.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(o),this.state=q.TOUCH_DOLLY_PAN;break;case ut.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(o),this.state=q.TOUCH_DOLLY_ROTATE;break;default:this.state=q.NONE}break;default:this.state=q.NONE}this.state!==q.NONE&&this.dispatchEvent(ta)}function mr(o){switch(this._trackPointer(o),this.state){case q.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(o),this.update();break;case q.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(o),this.update();break;case q.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(o),this.update();break;case q.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(o),this.update();break;default:this.state=q.NONE}}function fr(o){this.enabled!==!1&&o.preventDefault()}function dr(o){o.key==="Control"&&(this._controlActive=!0,this.domElement.ownerDocument.addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function pr(o){o.key==="Control"&&(this._controlActive=!1,this.domElement.ownerDocument.removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}var vo={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

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


		}`};var ps={name:"LuminosityHighPassShader",uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new pe(0)},defaultOpacity:{value:0}},vertexShader:`

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

		}`};var at=class o extends us{constructor(e,s=1,r,l){super(),this.strength=s,this.radius=r,this.threshold=l,this.resolution=e!==void 0?new L(e.x,e.y):new L(256,256),this.clearColor=new pe(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let h=Math.round(this.resolution.x/2),u=Math.round(this.resolution.y/2);this.renderTargetBright=new bt(h,u,{type:je,depthBuffer:!1}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let c=0;c<this.nMips;c++){let m=new bt(h,u,{type:je,depthBuffer:!1});m.texture.name="UnrealBloomPass.h"+c,m.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(m);let y=new bt(h,u,{type:je,depthBuffer:!1});y.texture.name="UnrealBloomPass.v"+c,y.texture.generateMipmaps=!1,this.renderTargetsVertical.push(y),h=Math.round(h/2),u=Math.round(u/2)}let f=ps;this.highPassUniforms=Qo.clone(f.uniforms),this.highPassUniforms.luminosityThreshold.value=l,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new ye({uniforms:this.highPassUniforms,vertexShader:f.vertexShader,fragmentShader:f.fragmentShader}),this.separableBlurMaterials=[];let t=[6,10,14,18,22];h=Math.round(this.resolution.x/2),u=Math.round(this.resolution.y/2);for(let c=0;c<this.nMips;c++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(t[c])),this.separableBlurMaterials[c].uniforms.invSize.value=new L(1/h,1/u),h=Math.round(h/2),u=Math.round(u/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=s,this.compositeMaterial.uniforms.bloomRadius.value=.1;let p=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=p,this.bloomTintColors=[new b(1,1,1),new b(1,1,1),new b(1,1,1),new b(1,1,1),new b(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=Qo.clone(vo.uniforms),this.blendMaterial=new ye({uniforms:this.copyUniforms,vertexShader:vo.vertexShader,fragmentShader:vo.fragmentShader,premultipliedAlpha:!0,blending:Oa,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new pe,this._oldClearAlpha=1,this._basic=new ho,this._fsQuad=new fo(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(e,s){let r=Math.round(e/2),l=Math.round(s/2);this.renderTargetBright.setSize(r,l);for(let h=0;h<this.nMips;h++)this.renderTargetsHorizontal[h].setSize(r,l),this.renderTargetsVertical[h].setSize(r,l),this.separableBlurMaterials[h].uniforms.invSize.value=new L(1/r,1/l),r=Math.round(r/2),l=Math.round(l/2)}render(e,s,r,l,h){e.getClearColor(this._oldClearColor),this._oldClearAlpha=e.getClearAlpha();let u=e.autoClear;e.autoClear=!1,e.setClearColor(this.clearColor,0),h&&e.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=r.texture,e.setRenderTarget(null),e.clear(),this._fsQuad.render(e)),this.highPassUniforms.tDiffuse.value=r.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,e.setRenderTarget(this.renderTargetBright),e.clear(),this._fsQuad.render(e);let f=this.renderTargetBright;for(let t=0;t<this.nMips;t++)this._fsQuad.material=this.separableBlurMaterials[t],this.separableBlurMaterials[t].uniforms.colorTexture.value=f.texture,this.separableBlurMaterials[t].uniforms.direction.value=o.BlurDirectionX,e.setRenderTarget(this.renderTargetsHorizontal[t]),e.clear(),this._fsQuad.render(e),this.separableBlurMaterials[t].uniforms.colorTexture.value=this.renderTargetsHorizontal[t].texture,this.separableBlurMaterials[t].uniforms.direction.value=o.BlurDirectionY,e.setRenderTarget(this.renderTargetsVertical[t]),e.clear(),this._fsQuad.render(e),f=this.renderTargetsVertical[t];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,e.setRenderTarget(this.renderTargetsHorizontal[0]),e.clear(),this._fsQuad.render(e),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,h&&e.state.buffers.stencil.setTest(!0),this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(r),this._fsQuad.render(e)),e.setClearColor(this._oldClearColor,this._oldClearAlpha),e.autoClear=u}_getSeparableBlurMaterial(e){let s=[],r=e/3;for(let u=0;u<e;u++)s.push(.39894*Math.exp(-.5*u*u/(r*r))/r);let l=[],h=[];for(let u=1;u<e;u+=2){let f=s[u],t=u+1<e?s[u+1]:0,p=f+t;l.push((u*f+(u+1)*t)/p),h.push(p)}return new ye({defines:{KERNEL_PAIRS:l.length},uniforms:{colorTexture:{value:null},invSize:{value:new L(.5,.5)},direction:{value:new L(.5,.5)},centerWeight:{value:s[0]},gaussianOffsets:{value:l},gaussianWeights:{value:h}},vertexShader:`

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

				}`})}_getCompositeMaterial(e){return new ye({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`

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

				}`})}};at.BlurDirectionX=new L(1,0);at.BlurDirectionY=new L(0,1);var Vt="varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",oa=`
uniform float uNear; uniform float uFar;
float linZ(float d) { float z = d * 2.0 - 1.0; return (2.0 * uNear * uFar) / (uFar + uNear - z * (uFar - uNear)); }`,Xe={STATIC:0,REGION:2};function gs({renderer:o,camera:e,Q:s,smokeScene:r,SU:l,setMode:h}){let u=new fo(null),f=[],t=(v,k,I)=>{let Y=new bt(v,k,I);return f.push(Y),Y},p=v=>(v.depthTexture=new os(v.width,v.height),v.depthTexture.type=qa,v),c={type:je},m=p(t(16,16,{...c,samples:s.msaa})),y=p(t(16,16,{...c})),H=t(16,16,{...c,depthBuffer:!1}),S=t(16,16,{...c,depthBuffer:!1}),N=t(16,16,{...c,depthBuffer:!1}),O=t(16,16,{...c,depthBuffer:!1}),A=t(16,16,{...c,depthBuffer:!1}),F=t(16,16,{...c,format:Za,depthBuffer:!1,minFilter:jo,magFilter:jo}),U=t(16,16,{depthBuffer:!1}),d=new ye({uniforms:{tColor:{value:null},tDepth:{value:null}},vertexShader:Vt,fragmentShader:"uniform sampler2D tColor; uniform sampler2D tDepth; varying vec2 vUv; void main() { gl_FragColor = texture2D(tColor, vUv); gl_FragDepth = texture2D(tDepth, vUv).r; }",depthTest:!0,depthWrite:!0,depthFunc:No}),C=new ye({uniforms:{tStat:{value:y.texture},tEmb:{value:H.texture},tDepth:{value:y.depthTexture},uI:{value:1}},vertexShader:Vt,fragmentShader:"uniform sampler2D tStat; uniform sampler2D tEmb; uniform sampler2D tDepth; uniform float uI; varying vec2 vUv; void main() { gl_FragColor = vec4(texture2D(tStat, vUv).rgb + uI * texture2D(tEmb, vUv).rgb, 1.0); gl_FragDepth = texture2D(tDepth, vUv).r; }",depthTest:!0,depthWrite:!0,depthFunc:No}),M=new ye({uniforms:{tColor:{value:null},tDepth:{value:null},uFocus:{value:200},uEq:{value:600},uK:{value:1},uNear:{value:e.near},uFar:{value:e.far},uTexel:{value:new L},uMax:{value:8}},vertexShader:Vt,fragmentShader:`uniform sampler2D tColor; uniform sampler2D tDepth; uniform float uFocus; uniform float uEq; uniform float uK; uniform vec2 uTexel; uniform float uMax; varying vec2 vUv;
      ${oa}
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
      }`,depthTest:!1,depthWrite:!1}),D=new ye({uniforms:{tDepth:{value:null},uNear:{value:e.near},uFar:{value:e.far}},vertexShader:Vt,fragmentShader:`uniform sampler2D tDepth; varying vec2 vUv; ${oa} void main() { gl_FragColor = vec4(linZ(texture2D(tDepth, vUv).r), 0.0, 0.0, 1.0); }`,depthTest:!1,depthWrite:!1}),E=s.bloomReal?new at(new L(16,16),.5,.3,3.2):null;if(E){let v=E.materialHighPassFilter;v.uniforms.tSmoke={value:A.texture},v.fragmentShader=v.fragmentShader.replace("uniform sampler2D tDiffuse;",`uniform sampler2D tDiffuse;
uniform sampler2D tSmoke;`).replace("vec4 texel = texture2D( tDiffuse, vUv );",`vec4 texel = texture2D( tDiffuse, vUv );
			float bloomMask = clamp( texel.a - 1.0, 0.0, 1.0 );
			{ vec4 s = texture2D( tSmoke, vUv ); texel.rgb = texel.rgb * ( 1.0 - s.a ) + s.rgb; }`),v.fragmentShader=v.fragmentShader.replace("float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );","float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v ) * bloomMask;"),v.needsUpdate=!0}let z=new ye({uniforms:{tScene:{value:m.texture},tDepth:{value:m.depthTexture},tDofStat:{value:S.texture},tDofEmb:{value:N.texture},tDofLive:{value:O.texture},uDofK:{value:0},uBox:{value:new We(2,2,-1,-1)},uI:{value:1},tSmoke:{value:A.texture},tSmokeZ:{value:F.texture},uSmokeSize:{value:new L(1,1)},tBloom:{value:E?E.renderTargetsHorizontal[0].texture:null},uBloom:{value:E?1:0},uGlowPos:{value:new L},uGlowCol:{value:new b},uGlowR:{value:.05},uAspect:{value:1},uNear:{value:e.near},uFar:{value:e.far},seed:{value:0},toneMappingExposure:{value:1}},vertexShader:Vt,fragmentShader:`
      uniform sampler2D tScene; uniform sampler2D tDepth;
      uniform sampler2D tDofStat; uniform sampler2D tDofEmb; uniform sampler2D tDofLive; uniform float uDofK; uniform vec4 uBox; uniform float uI;
      uniform sampler2D tSmoke; uniform sampler2D tSmokeZ; uniform vec2 uSmokeSize;
      uniform sampler2D tBloom; uniform float uBloom;
      uniform vec2 uGlowPos; uniform vec3 uGlowCol; uniform float uGlowR; uniform float uAspect;
      uniform float seed;
      varying vec2 vUv;
      ${oa}
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
        vec3 c = texture2D(tScene, vUv).rgb;
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
        }
        { vec2 dv = (vUv - 0.5) * vec2(1.0, 0.8); c *= mix(0.62, 1.0, smoothstep(0.85, 0.2, length(dv))); }
        c = ACESFilmicToneMapping(c);
        vec4 o = sRGBTransferOETF(vec4(c, 1.0));
        float n = fract(sin(dot(gl_FragCoord.xy + seed * 37.0, vec2(12.9898, 78.233))) * 43758.5453);
        float l = dot(o.rgb, vec3(0.33));
        o.rgb += (n - 0.5) * (0.004 + 0.03 * l * (1.0 - l));
        gl_FragColor = o;
      }`,depthTest:!1,depthWrite:!1,toneMapped:!1}),ne=null,Z=!1,re=!1;import("./ember-SMAAPass-LXXAMYVG.js").then(({SMAAPass:v})=>{re||(ne=new v,ne.setSize(ie,ue),Z=!0)});let ie=16,ue=16,ge=16,ve=16;function P(v,k){ie=v,ue=k,ge=Math.max(1,Math.round(v*s.smokeScale)),ve=Math.max(1,Math.round(k*s.smokeScale));for(let I of[m,y,H,S,N,O,U])I.setSize(v,k);A.setSize(ge,ve),F.setSize(ge,ve),z.uniforms.uSmokeSize.value.set(ge,ve),z.uniforms.uAspect.value=v/k,M.uniforms.uTexel.value.set(1/v,1/k),M.uniforms.uMax.value=12*(k/1080),l.uRes.value.set(ge,ve),l.uPx.value=ve/(2*Math.tan(te.degToRad(e.fov/2))),E&&E.setSize(Math.round(v*s.bloomScale*2),Math.round(k*s.bloomScale*2)),ne?.setSize(v,k),ae="",we="",ee.valid=!1}function G(v,k,I){u.material=v,k&&(k.scissorTest=!!I,I&&k.scissor.copy(I)),o.setRenderTarget(k),u.render(o),k&&(k.scissorTest=!1)}let R=new We;function _(v,k,I,Y,W){let $=Math.max(0,Math.floor(v.x*k-Y)),De=Math.max(0,Math.floor(v.y*I-Y)),Qe=Math.min(k,Math.ceil(v.z*k+Y)),Se=Math.min(I,Math.ceil(v.w*I+Y));return W.set($,De,Math.max(0,Qe-$),Math.max(0,Se-De))}function B(v){let k=M.uniforms,I=2*v.s*Math.tan(te.degToRad(e.fov/2));k.uFocus.value=v.s,k.uEq.value=100+I*100/24;let Y=2.8*Math.max(1,(v.home/v.s)**2);k.uK.value=.5*(100/Y)*ue/I}let j=new We,ae="",de=[6,10,14,18,22];function Q(v){let k=v?`${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)},${v.w.toFixed(3)}`:"all",I=[E.renderTargetBright,...E.renderTargetsHorizontal,...E.renderTargetsVertical];if(o.setClearColor(0,0),k!==ae){for(let X of I)X.scissorTest=!1,o.setRenderTarget(X),o.clear(!0,!1,!1);ae=k}let Y=(X,Ae)=>{if(!v){X.scissorTest=!1;return}_(v,X.width,X.height,Ae,j),X.scissor.copy(j),X.scissorTest=!0},W=E.highPassUniforms;W.tDiffuse.value=m.texture,W.luminosityThreshold.value=E.threshold,u.material=E.materialHighPassFilter,Y(E.renderTargetBright,2),o.setRenderTarget(E.renderTargetBright),o.clear(!0,!1,!1),u.render(o);let $=E.renderTargetBright,De=2;for(let X=0;X<E.nMips;X++){let Ae=E.separableBlurMaterials[X],qe=E.renderTargetsHorizontal[X];De+=de[X]*(ie/qe.width);let Ut=De*(qe.width/ie)+2;u.material=Ae,Ae.uniforms.colorTexture.value=$.texture,Ae.uniforms.direction.value=at.BlurDirectionX,Y(qe,Ut),o.setRenderTarget(qe),o.clear(!0,!1,!1),u.render(o),Ae.uniforms.colorTexture.value=qe.texture,Ae.uniforms.direction.value=at.BlurDirectionY;let Et=E.renderTargetsVertical[X];Y(Et,Ut),o.setRenderTarget(Et),o.clear(!0,!1,!1),u.render(o),$=Et}let Qe=E.compositeMaterial;Qe.uniforms.bloomStrength.value=E.strength,Qe.uniforms.bloomRadius.value=E.radius,Qe.uniforms.bloomTintColors.value=E.bloomTintColors,u.material=Qe;let Se=E.renderTargetsHorizontal[0];Y(Se,De*(Se.width/ie)+2),o.setRenderTarget(Se),o.clear(!0,!1,!1),u.render(o);for(let X of I)X.scissorTest=!1}let nt=new We,we="";function Ee(v){let k=v?`${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)},${v.w.toFixed(3)}`:"all";if(o.setClearColor(0,0),k!==we){for(let Y of[A,F])Y.scissorTest=!1,o.setRenderTarget(Y),o.clear(!0,!1,!1);we=k}let I=v?_(v,ge,ve,2,nt):null;D.uniforms.tDepth.value=m.depthTexture,G(D,F,I),l.uDepthZ.value=F.texture,A.scissorTest=!!I,I&&A.scissor.copy(I),o.setRenderTarget(A),o.clear(!0,!1,!1),o.render(r,e),A.scissorTest=!1,o.setClearColor(0,1)}let ee={valid:!1,targets:f,debugTargets:{live:m,cStat:y,cEmb:H,dStat:S,dEmb:N,dLive:O,smoke:A,smokeZ:F},live:m,setSize:P,bake(v,k,I){let Y=e.layers.mask;o.setClearColor(0,1),I&&(e.layers.enable(Xe.STATIC),e.layers.enable(Xe.REGION),h("full"),o.shadowMap.needsUpdate=!0,o.setRenderTarget(m),o.clear(),o.render(v,e)),e.layers.set(Xe.STATIC),h("static"),o.setRenderTarget(m),o.clear(),o.render(v,e),d.uniforms.tColor.value=m.texture,d.uniforms.tDepth.value=m.depthTexture,o.setRenderTarget(y),o.clear(),G(d,y),h("ember"),o.setRenderTarget(m),o.clear(),o.render(v,e),u.material=d,d.uniforms.tColor.value=m.texture,o.setRenderTarget(H),u.render(o),h("full"),e.layers.mask=Y,s.dof&&(B(k),M.uniforms.tDepth.value=y.depthTexture,M.uniforms.tColor.value=y.texture,G(M,S),M.uniforms.tColor.value=H.texture,G(M,N)),ee.valid=!0},render(v){let k=v.scene;o.setClearColor(0,1);let I=e.layers.mask;if(v.still&&!v.truth){C.uniforms.uI.value=v.emberI,G(C,m);let $=o.autoClear;o.autoClear=!1,e.layers.set(Xe.REGION),h("region"),o.setRenderTarget(m),o.render(k,e),h("full"),o.autoClear=$,e.layers.mask=I}else e.layers.enable(Xe.STATIC),e.layers.enable(Xe.REGION),o.setRenderTarget(m),o.clear(),o.render(k,e),e.layers.mask=I;let Y=s.dof&&v.still?v.dofK:0;z.uniforms.uDofK.value=Y,Y>0&&(B(v.focus),M.uniforms.tColor.value=m.texture,M.uniforms.tDepth.value=m.depthTexture,v.truth?R.set(0,0,ie,ue):_(v.regionBox,ie,ue,M.uniforms.uMax.value+2,R),G(M,O,R),z.uniforms.uBox.value.set(R.x/ie,R.y/ue,(R.x+R.z)/ie,(R.y+R.w)/ue),z.uniforms.uI.value=v.emberI),Ee(v.still&&!v.truth?v.smokeBox:null);let W=E&&s.bloomReal;z.uniforms.uBloom.value=W?1:0,W?Q(v.still&&!v.truth?v.emberBox:null):(z.uniforms.uGlowPos.value.set(v.glow.x,v.glow.y),z.uniforms.uGlowR.value=v.glow.r,z.uniforms.uGlowCol.value.copy(v.glow.col)),z.uniforms.seed.value=v.seed,z.uniforms.toneMappingExposure.value=o.toneMappingExposure,!v.still&&s.smaa&&ne&&!Z?(G(z,U),ne.renderToScreen=!0,ne.render(o,null,U)):G(z,null),Z&&v.still&&(ne.renderToScreen=!1,ne.render(o,O,U),Z=!1)},dispose(){for(let v of f)v.dispose();for(let v of[d,C,M,D,z])v.dispose();u.dispose(),E?.dispose(),ne?.dispose(),re=!0}};return ee}var bo={uEmberPosV:{value:new b},uEmberCol:{value:new pe(0,0,0)},uEmberI:{value:0},uEmberCut:{value:140},uFlamePosV:{value:new b},uFlameCol:{value:new pe(0,0,0)},uFlameI:{value:0},uFlameCut:{value:420},uFlameFootV:{value:new b},uFlameShade:{value:0}};function vs(){Ye.lights_pars_begin.includes("uEmberPosV")||(Ye.lights_pars_begin+=`
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
`,Ye.lights_fragment_end+=`
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
		directLight.visible = true;
		ReflectedLight flameRL = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, flameRL );
		reflectedLight.directDiffuse += flameRL.directDiffuse;
		reflectedLight.directSpecular += min( flameRL.directSpecular, vec3( 1.8 ) );
	}
#endif
`)}function bs(o){let e=o.customProgramCacheKey(),s=o.onBeforeCompile;return o.onBeforeCompile=function(r,l){Object.assign(r.uniforms,bo),s&&s.call(this,r,l)},o.customProgramCacheKey=()=>e,o}var gr=new pe(16738852),vr=new b,Gr=new pe(16754253),Yr=new b;function aa(o,e,s,r=180){bo.uEmberPosV.value.copy(vr.copy(o).applyMatrix4(e.matrixWorldInverse)),bo.uEmberCol.value.copy(gr).multiplyScalar(r),bo.uEmberI.value=s}var ys=5;function ws({canvas:o,camera:e,controls:s,listen:r,onActive:l}){let h=[],u=new mo;u.layers.set(ys);let f=new L,t=[],p=null,c=null,m=null,y=null,H=null,S=new Map;function N(d,C){let M=o.getBoundingClientRect();return f.set((d-M.left)/M.width*2-1,-((C-M.top)/M.height)*2+1),u.setFromCamera(f,e),u.ray}function O(d,C){N(d,C),t.length=0;for(let E of h)E.canGrab()&&u.intersectObjects(E.meshes,!1,t);if(!t.length)return null;t.sort((E,z)=>E.distance-z.distance);let M=t[0],D=h.find(E=>E.meshes.includes(M.object));return D?{item:D,point:M.point.clone(),object:M.object}:null}function A(d){p=d.hit.item,c=d,s.enabled=!1,o.style.cursor="grabbing";try{o.setPointerCapture(d.id)}catch{}p.pick(d.hit,N(d.x,d.y)),navigator.vibrate?.(8)}function F(d){if(!p)return;let C=p;p=c=null,s.enabled=!0,o.style.cursor="",d==="home"?C.home():C.release()}r(o,"pointerdown",d=>{if(l(),d.pointerType==="touch"&&S.set(d.pointerId,{x:d.clientX,y:d.clientY}),p)return;if(d.pointerType==="touch"&&S.size>1){m&&clearTimeout(m.timer),m=null;return}if(d.button>0)return;let C=O(d.clientX,d.clientY);C&&(m={id:d.pointerId,x:d.clientX,y:d.clientY,t:performance.now(),stamp:d.timeStamp,hit:C,touch:d.pointerType==="touch",timer:0,moved:!1},m.touch?m.timer=setTimeout(()=>{if(m&&!p){let M=m;m=null,A(M)}},150):(d.stopImmediatePropagation(),m.timer=setTimeout(()=>{if(m&&!p){let M=m;m=null,A(M)}},200)))},{capture:!0}),r(window,"pointermove",d=>{if(d.pointerType==="touch"&&S.has(d.pointerId)&&(S.set(d.pointerId,{x:d.clientX,y:d.clientY}),p&&S.size===2)){let[C,M]=[...S.values()],D=Math.atan2(M.y-C.y,M.x-C.x);if(H!==null){let E=D-H;E>Math.PI&&(E-=2*Math.PI),E<-Math.PI&&(E+=2*Math.PI),p.twist(-E)}H=D;return}if(m&&d.pointerId===m.id&&Math.hypot(d.clientX-m.x,d.clientY-m.y)>6){clearTimeout(m.timer);let C=m;m=null,C.moved=!0,C.touch||A(C)}if(p){l(),p.aim(N(d.clientX,d.clientY));return}d.pointerType==="mouse"&&!d.buttons&&d.target===o&&(y={x:d.clientX,y:d.clientY})});let U=d=>{S.delete(d.pointerId),S.size<2&&(H=null);let C=M=>M.touch?150:200;if(m&&d.pointerId===m.id){clearTimeout(m.timer);let M=m;m=null,d.type==="pointerup"&&d.timeStamp-M.stamp<C(M)&&M.hit.item.onTap(M.hit);return}if(p&&c&&d.pointerId===c.id&&d.type==="pointerup"&&!c.moved&&d.timeStamp-c.stamp<C(c)){let M=p,D=c;p=c=null,s.enabled=!0,o.style.cursor="",M.cancel(),M.onTap(D.hit);return}p&&S.size===0&&F("release")};return r(window,"pointerup",U),r(window,"pointercancel",U),r(o,"wheel",d=>{p&&(d.preventDefault(),d.stopImmediatePropagation(),p.twist(Math.sign(d.deltaY)*.18))},{passive:!1,capture:!0}),r(window,"keydown",d=>{d.key==="Escape"&&p&&F("home")}),{add(d){h.push(d);for(let C of d.meshes)C.layers.enable(ys)},get held(){return p},drop(d="release"){m&&clearTimeout(m.timer),m=null,F(d)},hover(){if(!y||p||m)return;let d=O(y.x,y.y);o.style.cursor=d?"grab":"",y=null},dispose(){m&&clearTimeout(m.timer)}}}function xs({length:o,radius:e,massA:s,massB:r,samples:l=9,sdf:h,floorY:u=0}){let f=new Float64Array(3),t=new Float64Array(3),p=new Float64Array(3),c=new Float64Array(3),m=new Float64Array(3),y=new Float64Array(3),H=1/s,S=1/r,N=new Float64Array(3),O=new Float64Array(3),A={A:f,B:t,awake:!1,roll:0,restFor:0,contact:!1,drop(U,d,C,M){f.set(U),t.set(d),m.set(C),y.set(M),A.awake=!0,A.restFor=0},step(U){if(!A.awake)return!1;let d=Math.max(2,Math.ceil(U/.004)),C=U/d;for(let D=0;D<d;D++)F(C);let M=Math.hypot(m[0],m[1],m[2])+Math.hypot(y[0],y[1],y[2]);return A.restFor=M<6&&A.contact?A.restFor+U:0,A.restFor>.4&&(A.awake=!1,m.fill(0),y.fill(0)),!0}};function F(U){for(let d=0;d<3;d++)p[d]=f[d],c[d]=t[d];m[1]+=-9810*U,y[1]+=-9810*U;for(let d=0;d<3;d++)f[d]+=m[d]*U,t[d]+=y[d]*U;A.contact=!1;for(let d=0;d<2;d++){let C=t[0]-f[0],M=t[1]-f[1],D=t[2]-f[2],E=Math.hypot(C,M,D)||1,z=(E-o)/E/(H+S);f[0]+=C*z*H,f[1]+=M*z*H,f[2]+=D*z*H,t[0]-=C*z*S,t[1]-=M*z*S,t[2]-=D*z*S;for(let ne=0;ne<l;ne++){let Z=ne/(l-1);for(let j=0;j<3;j++)O[j]=f[j]+(t[j]-f[j])*Z;let re=h(O[0],O[1],O[2],N)-e,ie=N[0],ue=N[1],ge=N[2],ve=O[1]-u-e;if(ve<re&&(re=ve,ie=0,ue=1,ge=0),re>=0)continue;A.contact=!0;let P=(1-Z)*H,G=Z*S,R=(1-Z)*P+Z*G||1,_=-re*P/R,B=-re*G/R;f[0]+=ie*_,f[1]+=ue*_,f[2]+=ge*_,t[0]+=ie*B,t[1]+=ue*B,t[2]+=ge*B}}for(let d=0;d<3;d++)m[d]=(f[d]-p[d])/U,y[d]=(t[d]-c[d])/U;if(Es(m),Es(y),A.contact){let d=Math.exp(-U*22);for(let z=0;z<3;z++)z!==1&&(m[z]*=d,y[z]*=d);let C=t[0]-f[0],M=t[2]-f[2],D=Math.hypot(C,M)||1,E=((m[0]+y[0])*.5*-M+(m[2]+y[2])*.5*C)/D;A.roll+=E*U/e}}return A}function Es(o){let e=Math.hypot(o[0],o[1],o[2]);if(e>1500){let s=1500/e;o[0]*=s,o[1]*=s,o[2]*=s}}var wt=84,sa=4.1;function Ts({camera:o,sdfGrad:e,notchPose:s,notchSeat:r,cigLength:l,onBreak:h,onChange:u}){let f=xs({length:wt,radius:sa,massA:1.35,massB:.65,sdf:e}),t={mode:"rest",c:null,xg:40,P:new b,V:new b,T:new b,off:new b,offSet:!1,accF:new b,holdY:0,baseY:0,lift:0,yaw:0,pitch:0,dYaw:0,dPitch:0,vYaw:0,vPitch:0,roll:0,acc:new b,fan:0,sway:new L,swayV:new L,glideT:0,glideK:0,q0:new Ge,q1:new Ge,p0:new b,p1:new b,before:new Ke,modeBefore:"rest"},p=new yt(new b(0,1,0),0),c=new b,m=new b,y=new b,H=new b,S=new b,N=new b,O=new b,A=new b(0,1,0),F=new Ke,U=new Ke,d=new Ge,C=new b(1,1,1),M=new Float64Array(3),D=new b,E=new b,z=new b,ne=new co;function Z(P,G,R,_){S.subVectors(G,P).normalize();let B=Math.abs(S.y)>.95?c.set(1,0,0):A;return O.crossVectors(S,B).normalize(),N.crossVectors(O,S).normalize(),R&&(d.setFromAxisAngle(S,R),N.applyQuaternion(d),O.applyQuaternion(d)),_.makeBasis(S,N,O).setPosition(P)}function re(P){t.c.group.matrix.copy(P),t.c.group.matrixWorldNeedsUpdate=!0}function ie(P,G,R){G.setFromMatrixPosition(P),R.set(wt,0,0).applyMatrix4(P)}let ue=()=>Math.min(wt,t.c.b+.7+t.c.ashLen+.6);function ge(){let G=ue();for(let R=0;R<3;R++){let _=0,B=0,j=0,ae=0;for(let Q=0;Q<10;Q++){let nt=Q/9*G-t.xg;m.copy(S).multiplyScalar(nt).add(t.P);let we=e(m.x,m.y,m.z,M)-sa,Ee=M[0],ee=M[1],v=M[2],k=m.y-sa;k<we&&(we=k,Ee=0,ee=1,v=0),we<_&&(_=we,B=Ee,j=ee,ae=v)}if(_>=0)return;t.P.x-=B*_,t.P.y-=j*_,t.P.z-=ae*_;let de=t.V.x*B+t.V.y*j+t.V.z*ae;de<0&&(t.V.x-=de*B,t.V.y-=de*j,t.V.z-=de*ae)}}let ve={st:t,get busy(){return t.mode==="held"||t.mode==="glide"||t.mode==="fall"},reset(P){t.c=P,t.mode="rest",t.fan=0,t.sway.set(0,0),t.swayV.set(0,0),P.ash.rotation.set(0,0,0)},pick(P,G){t.c=P,t.before.copy(P.group.matrix),t.modeBefore=t.mode,U.copy(P.group.matrix).invert(),c.copy(G).applyMatrix4(U),t.xg=te.clamp(c.x,4,ue()-2),ie(P.group.matrix,y,H),S.subVectors(H,y).normalize(),t.P.copy(S).multiplyScalar(t.xg).add(y),t.V.set(0,0,0),t.yaw=Math.atan2(S.z,S.x),t.pitch=Math.asin(te.clamp(S.y,-1,1)),t.dYaw=t.dPitch=t.vYaw=t.vPitch=0,t.baseY=t.P.y,t.holdY=t.P.y+25,t.lift=0,t.T.copy(t.P),t.offSet=!1,t.accF.set(0,0,0),t.mode="held",u()},aim(P){if(p.constant=-t.holdY,ne.copy(P),!ne.intersectPlane(p,m))return;t.offSet||(t.off.set(t.P.x-m.x,0,t.P.z-m.z),t.offSet=!0),m.add(t.off),m.y=t.T.y;let G=Math.hypot(m.x,m.z);if(G>160){let R=(160+50*Math.tanh((G-160)/50))/G;m.x*=R,m.z*=R}t.T.copy(m)},twist(P){t.yaw+=P},cancel(){t.mode==="held"&&(re(t.before),t.V.set(0,0,0),t.mode=t.modeBefore==="lying"?"lying":"rest",u())},release(){if(t.mode!=="held")return-1;ie(t.c.group.matrix,y,H);let P=-1,G=12;for(let R=0;R<3;R++){let _=r(R),B=br(_,y,H);B.across<G&&B.above>-6&&B.above<45&&(G=B.across,P=R)}return P>=0?(ve.glideTo(P),P):(c.copy(t.V),f.drop([y.x,y.y,y.z],[H.x,H.y,H.z],[c.x,c.y,c.z],[c.x,c.y,c.z]),f.roll=0,t.mode="fall",u(),-1)},glideTo(P){t.c.group.matrix.decompose(t.p0,t.q0,C),s(P,F),F.decompose(t.p1,t.q1,C),t.glideK=P,t.glideT=0,t.mode="glide",u()},update(P,G){let R=t.c;if(!R)return!1;if(t.mode==="held"){t.lift=Math.min(1,t.lift+P/.35),t.T.y=t.baseY+25*t.lift*t.lift*(3-2*t.lift),D.copy(t.P),E.copy(t.V);let B=220,j=2*Math.sqrt(B)*.72,ae=3,de=P/ae;c.set(B*(t.T.x-t.P.x)-j*t.V.x,B*(t.T.y-t.P.y)-j*t.V.y,B*(t.T.z-t.P.z)-j*t.V.z);for(let Y=0;Y<ae;Y++)t.V.x+=(B*(t.T.x-t.P.x)-j*t.V.x)*de,t.V.y+=(B*(t.T.y-t.P.y)-j*t.V.y)*de,t.V.z+=(B*(t.T.z-t.P.z)-j*t.V.z)*de,t.P.addScaledVector(t.V,de);t.acc.subVectors(t.V,E).divideScalar(Math.max(P,1e-4)),t.accF.lerp(c,1-Math.exp(-Math.max(P,.016)/.03));let Q=.35+Math.abs(wt*.42-t.xg)/wt,nt=-Math.sin(t.yaw),we=Math.cos(t.yaw),Ee=t.acc.x*nt+t.acc.z*we,ee=90,v=2*Math.sqrt(ee)*.45;t.vYaw+=(-ee*t.dYaw-v*t.vYaw-Ee/9e3*Q*ee)*P,t.vPitch+=(-ee*t.dPitch-v*t.vPitch-t.acc.y/9e3*Q*ee)*P,t.dYaw=te.clamp(t.dYaw+t.vYaw*P,-.26,.26),t.dPitch=te.clamp(t.dPitch+t.vPitch*P,-.22,.22),t.pitch+=(te.degToRad(-6)-t.pitch)*Math.min(1,P*3);let k=t.yaw+t.dYaw,I=t.pitch+t.dPitch;S.set(Math.cos(k)*Math.cos(I),Math.sin(I),Math.sin(k)*Math.cos(I)),ge(),y.copy(S).multiplyScalar(-t.xg).add(t.P),H.copy(S).multiplyScalar(wt).add(y),re(Z(y,H,t.roll,F))}else if(t.mode==="glide"){t.glideT=Math.min(1,t.glideT+P/.45);let B=t.glideT,j=1-Math.pow(1-B,3);c.lerpVectors(t.p0,t.p1,j),c.y+=Math.sin(Math.min(1,B*1.25)*Math.PI)*6*(1-B)+(B>.8?-.6*Math.sin((B-.8)/.2*Math.PI):0),d.slerpQuaternions(t.q0,t.q1,j),F.compose(c,d,C),re(F),t.V.set(0,0,0),B>=1&&(R.notch=t.glideK,t.mode="rest",u())}else t.mode==="fall"&&(f.step(P),y.set(f.A[0],f.A[1],f.A[2]),H.set(f.B[0],f.B[1],f.B[2]),re(Z(y,H,f.roll,F)),t.V.set(0,0,0),f.awake||(t.mode="lying",u()));let _=t.mode==="held"?t.V.length():0;if(t.fan=Math.max(t.fan*Math.exp(-P/1),Math.min(1,_/420)),t.mode==="held"&&G&&R.ashLen>.6){ie(R.group.matrix,y,H),S.subVectors(H,y).normalize(),O.crossVectors(S,A).normalize(),N.crossVectors(O,S).normalize();let B=t.acc.dot(N),j=t.acc.dot(O),ae=140,de=2*Math.sqrt(ae)*.35;t.swayV.x+=(-ae*t.sway.x-de*t.swayV.x-B/6e3*ae*.12)*P,t.swayV.y+=(-ae*t.sway.y-de*t.swayV.y-j/6e3*ae*.12)*P,t.sway.x=te.clamp(t.sway.x+t.swayV.x*P,-.2,.2),t.sway.y=te.clamp(t.sway.y+t.swayV.y*P,-.2,.2),R.ash.rotation.set(0,t.sway.y,t.sway.x),t.accF.length()>9e3*(1.3-.6*(R.ashLen/15))&&(h(R,t.V),t.sway.set(0,0),t.swayV.set(0,0),R.ash.rotation.set(0,0,0))}else(t.sway.x||t.sway.y)&&(t.sway.multiplyScalar(Math.exp(-P*6)),Math.abs(t.sway.x)+Math.abs(t.sway.y)<.001&&t.sway.set(0,0),R.ash.rotation.set(0,t.sway.y,t.sway.x));return ve.busy}};return ve}var ra={across:0,above:0};function br(o,e,s){let r=s.x-e.x,l=s.z-e.z,h=Math.min(1,Math.max(0,((o.x-e.x)*r+(o.z-e.z)*l)/(r*r+l*l||1))),u=e.x+r*h,f=e.z+l*h;return ra.across=Math.hypot(o.x-u,o.z-f),ra.above=e.y+(s.y-e.y)*h-o.y,ra}var yo=(o,e,s)=>o<e?e:o>s?s:o;function Ms(o,e,s){let r=Math.max(s-Math.abs(o-e),0)/s;return Math.min(o,e)-r*r*s*.25}function na(o,e,s){let r=Math.max(s-Math.abs(o-e),0)/s;return Math.max(o,e)+r*r*s*.25}function st(o,e,s){let r=o*374761393+e*668265263+s*2147483647|0;return r=Math.imul(r^r>>>13,1274126177),r^=r>>>16,(r&65535)/32767.5-1}var ia=o=>o*o*o*(o*(o*6-15)+10),mt=(o,e,s)=>o+(e-o)*s;function Re(o,e,s){let r=Math.floor(o),l=Math.floor(e),h=Math.floor(s),u=ia(o-r),f=ia(e-l),t=ia(s-h);return mt(mt(mt(st(r,l,h),st(r+1,l,h),u),mt(st(r,l+1,h),st(r+1,l+1,h),u),f),mt(mt(st(r,l,h+1),st(r+1,l,h+1),u),mt(st(r,l+1,h+1),st(r+1,l+1,h+1),u),f),t)}var fe={radius:57.5,height:32,floor:9.2,bowlTop:46.3,bowlBottom:33,notch:{r:4.45,depth:4.6,angles:[.5,.5+2*Math.PI/3+.06,.5+4*Math.PI/3-.05]}},la=(o,e)=>o*o+e*e;function Rs(o,e,s,r,l){let h=r,u=l,f=r-s,t=2*l;o=Math.abs(o);let p=o-Math.min(o,e<0?s:r),c=Math.abs(e)-l,m=yo(((h-o)*f+(u-e)*t)/la(f,t),0,1),y=o-h+f*m,H=e-u+t*m;return(y<0&&c<0?-1:1)*Math.sqrt(Math.min(la(p,c),la(y,H)))}function yr(o,e,s,r,l){let h=Math.abs(o)-s+l,u=Math.abs(e)-r+l;return Math.hypot(Math.max(h,0),Math.max(u,0))+Math.min(Math.max(h,u),0)-l}function ca(o){return{rim:.55*Math.sin(2*o+1.3)+.35*Math.sin(3*o+.4)+.18*Math.sin(5*o+2.1),out:.42*Math.sin(2*o+.2)+.25*Math.sin(4*o+1.7),inn:.5*Math.sin(3*o+2.6)+.22*Math.sin(5*o+.9)}}var Lt=1024,Ve=new Float32Array((Lt+1)*3);for(let o=0;o<=Lt;o++){let e=ca(o/Lt*2*Math.PI-Math.PI);Ve[o*3]=e.rim,Ve[o*3+1]=e.out,Ve[o*3+2]=e.inn}var wo={rim:0,out:0,inn:0};function wr(o){let e=(o+Math.PI)/(2*Math.PI)*Lt,s=Math.min(Lt-1,Math.max(0,Math.floor(e))),r=e-s;return wo.rim=Ve[s*3]+(Ve[s*3+3]-Ve[s*3])*r,wo.out=Ve[s*3+1]+(Ve[s*3+4]-Ve[s*3+1])*r,wo.inn=Ve[s*3+2]+(Ve[s*3+5]-Ve[s*3+2])*r,wo}var Er=fe.notch.angles.map(o=>ca(o).rim),Ss=fe.notch.angles.flatMap(o=>[Math.cos(o),Math.sin(o)]);function Bt(o,e,s){let r=fe,l=Math.atan2(s,o),h=wr(l),u=h.out,f=h.inn,t=h.rim,p=Math.hypot(o*1.006,s),c=t*yo((e-12)/20,0,1),m=e-c,y=2.6,H=Rs(p-u,m-(3+r.height)/2,47-y,r.radius-y,(r.height-3)/2-y)-y;H=Ms(H,yr(p-42.6,e-2,3.4,2.1,1.1),1.6);let S=7,N=Rs(p+f,m-(r.floor+48)/2,r.bowlBottom-S,r.bowlTop+3-S+.35,(48-r.floor)/2-S)-S;H=na(H,-N,2.4);let O=r.notch,A=r.height-O.depth+O.r;if(e>A-O.r-3&&p>36)for(let F=0;F<3;F++){let U=O.angles[F],d=Ss[F*2],C=Ss[F*2+1],M=o*d+s*C,D=-o*C+s*d,E=yo(M,40,62);if(Math.abs(D)>O.r+3)continue;let z=Math.hypot(M-E,D,e-(A+Er[F]))-O.r;H=na(H,-z,1.7)}return H+=.28*Re(o*.045,e*.06,s*.045)+.08*Re(o*.16+7,e*.16,s*.16),H}function _s(o){let e=fe.notch.angles[o],s=fe.height-fe.notch.depth+fe.notch.r+ca(e).rim;return{angle:e,dir:[Math.cos(e),0,Math.sin(e)],y:s-fe.notch.r,r:fe.notch.r}}var Le={length:84,radius:3.9,filter:25,ashMax:15};function xr(o,e){let s=new Wo(o.map(([u,f])=>new L(u,f)),e);s.rotateZ(-Math.PI/2);let r=s.attributes.position,l=new Float32Array(r.count),h=new Float32Array(r.count);for(let u=0;u<r.count;u++)l[u]=r.getX(u),h[u]=Math.atan2(r.getZ(u),-r.getY(u))/(2*Math.PI)+.5;return s.setAttribute("aAlong",new oe(l,1)),s.setAttribute("aAround",new oe(h,1)),s}var Ps=`
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
`;function ha(o,e){let s=e,r=new Ne({color:16777215,roughness:.72,sheen:.4,sheenRoughness:.6,sheenColor:new pe(.9,.86,.8)}),l={uBurn:{value:64.5},uSeed:{value:.3},uLit:{value:1},uFade:{value:1},uAshScale:{value:1},uPart:{value:0}};r.userData.u=l,r.onBeforeCompile=c=>{Object.assign(c.uniforms,l,{uTime:s.uTime,uEmber:s.uEmber,tCork:{value:o.cork},tPaper:{value:o.paper},tFibre:{value:o.fibre}}),c.vertexShader=c.vertexShader.replace("#include <common>",`#include <common>
attribute float aAlong;
attribute float aAround;
varying float vAlong;
varying float vAround;
varying vec3 vLocalN;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vAlong = aAlong;
vAround = aAround;
vLocalN = normal;`),c.fragmentShader=c.fragmentShader.replace("#include <common>",`#include <common>
        varying float vAlong; varying float vAround; varying vec3 vLocalN;
        uniform float uBurn; uniform float uSeed; uniform float uLit; uniform float uFade; uniform float uTime; uniform float uEmber; uniform float uPart;
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
        diffuseColor.rgb = col;
        diffuseColor.a *= uFade;`).replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
        roughnessFactor = mix(0.55, roughnessFactor, step(25.0, vAlong));
        roughnessFactor = mix(0.9, roughnessFactor, smoothstep(0.1, 0.4, d / 2.6));`).replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
        // the ember shows through the thin paper in the last few millimetres
        totalEmissiveRadiance += vec3(1.0, 0.36, 0.1) * uEmber * uLit * exp(-d / 1.05) * 1.4 * smoothstep(0.05, 0.25, d / 2.6) * step(25.0, vAlong) * smoothstep(4.0, 3.0, d);`),c.fragmentShader=c.fragmentShader.replace("#include <opaque_fragment>",`#include <opaque_fragment>
#ifdef OPAQUE
gl_FragColor.a = 1.0 + step(d, 4.0) * step(25.0, vAlong) * uLit;
#endif`),c.fragmentShader=c.fragmentShader.replace("void main() {",`varying vec3 vObjP;
vec2 vObjYZ() { return vObjP.yz; }
void main() {`),c.vertexShader=c.vertexShader.replace("#include <common>",`#include <common>
varying vec3 vObjP;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vObjP = position;`)},r.customProgramCacheKey=()=>"cig-body",r.transparent=!1;let h=Tr(l),u=new ye({uniforms:{uTime:s.uTime,uEmber:s.uEmber,uLit:l.uLit,uFade:l.uFade},vertexShader:"varying vec3 vP; varying vec3 vN; void main() { vP = position; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",fragmentShader:`${Ps}
      uniform float uTime; uniform float uEmber; uniform float uLit; uniform float uFade;
      varying vec3 vP; varying vec3 vN;
      void main() {
        vec3 c = emberGlow(vP, uTime, uEmber - 1.0) * (4.0 + 12.0 * uEmber) * uLit;
        // where the glow dies the coal is charcoal-dark
        vec3 dark = vec3(0.025, 0.018, 0.016);
        gl_FragColor = vec4((dark + c) * uFade, 2.0); // (alpha above 1: blooms)
      }`}),f=new Ne({color:16777215,roughness:.95});f.onBeforeCompile=c=>{Object.assign(c.uniforms,{uTime:s.uTime,uEmber:s.uEmber,uLit:l.uLit,uFade:l.uFade,uBurn:l.uBurn,uAshScale:l.uAshScale}),c.vertexShader=c.vertexShader.replace("#include <common>",`#include <common>
varying vec3 vAshP;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vAshP = position;`),c.fragmentShader=c.fragmentShader.replace("#include <common>",`#include <common>
        ${Ps}
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
        totalEmissiveRadiance += emberGlow(ashQ * 1.3, uTime, uEmber - 1.0) * (ashCrack * 3.2 + ashPore * 0.9 + 0.3) * exp(-max(ashX, 0.0) / 1.3) * (2.2 + 6.0 * uEmber) * uLit * uFade;`)};let t=f.onBeforeCompile;f.onBeforeCompile=c=>{t(c),c.fragmentShader=c.fragmentShader.replace("#include <opaque_fragment>",`#include <opaque_fragment>
#ifdef OPAQUE
gl_FragColor.a = 1.0 + uLit;
#endif`)},f.customProgramCacheKey=()=>"cig-ash";let p=new Ne({color:5913119,roughness:.85});return{body:r,bodyDepth:h,ember:u,ash:f,tobacco:p,u:l}}function Tr(o){let e=new rs({depthPacking:Wa});return e.onBeforeCompile=s=>{Object.assign(s.uniforms,{uBurn:o.uBurn,uSeed:o.uSeed}),s.vertexShader=s.vertexShader.replace("#include <common>",`#include <common>
attribute float aAlong;
attribute float aAround;
varying float vAlong;
varying float vAround;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vAlong = aAlong;
vAround = aAround;`),s.fragmentShader=s.fragmentShader.replace("#include <common>",`#include <common>
varying float vAlong; varying float vAround; uniform float uBurn; uniform float uSeed;`).replace("void main() {",`void main() {
        float a = vAround * 6.2831853;
        if (uBurn + 0.42 * sin(a * 3.0 + uSeed * 6.0) + 0.27 * sin(a * 7.0 + 0.4 + uSeed) + 0.15 * sin(a * 13.0 + uSeed * 3.0) - vAlong < 0.0) discard;`)},e.customProgramCacheKey=()=>"cig-depth",e}function Hs(o){return xr([[0,.35],[3.25,.35],[3.42,.21],[3.6,.05],[3.8,.02],[3.88,.12],[3.9,.32],[3.9,2],...Array.from({length:41},(e,s)=>[3.9,2+s*2]),[0,84]],o)}function Ds(o){let e=new Wo([[0,-.6],[3.93,-.6],[3.95,-.15],[3.92,.35],[3.82,.75],[3.45,1.1],[2.7,1.5],[1.4,1.9],[0,2]].map(([s,r])=>new L(s,r)),o);return e.rotateZ(-Math.PI/2),e}function As(o){let e=Le.ashMax,s=90,r=o+1,l=[],h=[],u=p=>-.0055*(p+.7)*(p+.7);for(let p=0;p<=s;p++){let m=p/s*e,y=Math.min(1,m/1.6),H=.935+.065*y*y*(3-2*y);for(let S=0;S<=o;S++){let N=S/o*Math.PI*2,O=.035*Math.sin(m*2.4+1.7*Math.sin(N*2+m*.3))+.09*Re(m*.9,Math.cos(N)*2,Math.sin(N)*2)+.05*Re(m*2.3+4,Math.cos(N)*4,Math.sin(N)*4),A=Math.max(0,(m-(e-2.6))/2.6),F=Math.sqrt(Math.max(0,1-A*A*(.92+.08*Re(N*2,3,1)))),U=(4.03+O)*(.25+.75*F)*H;l.push(m,Math.cos(N)*U*-1+u(m),Math.sin(N)*U)}}for(let p=0;p<s;p++)for(let c=0;c<o;c++){let m=p*r+c,y=m+r;h.push(m,y,m+1,m+1,y,y+1)}let f=l.length/3;l.push(e+.05,u(e+.05),0);for(let p=0;p<o;p++)h.push(s*r+p,f,s*r+p+1);let t=new tt;return t.setAttribute("position",new Ja(l,3)),t.setIndex(h),t.computeVertexNormals(),t}function ks(){let o=[],e=11,s=()=>(e=e*16807%2147483647)/2147483647;for(let l=0;l<7;l++){let h=s()*Math.PI*2,u=3.2+s()*.6,f=[];for(let t=0;t<=5;t++){let p=t/5,c=u+p*(.4+s()*.5),m=h+p*(s()-.5)*.8;f.push(new b(-.6+p*(1.2+s()*1.4),-Math.cos(m)*c,Math.sin(m)*c))}o.push(new Xo(new qo(f),10,.07+s()*.05,5,!1))}let r=Mr(o);for(let l of o)l.dispose();return r}function Mr(o){let e=0,s=0;for(let c of o)e+=c.attributes.position.count,s+=c.index.count;let r=new Float32Array(e*3),l=new Float32Array(e*3),h=new Float32Array(e*2),u=new Uint32Array(s),f=0,t=0;for(let c of o){r.set(c.attributes.position.array,f*3),l.set(c.attributes.normal.array,f*3),h.set(c.attributes.uv.array,f*2);let m=c.index.array;for(let y=0;y<m.length;y++)u[t+y]=m[y]+f;f+=c.attributes.position.count,t+=m.length}let p=new tt;return p.setAttribute("position",new oe(r,3)),p.setAttribute("normal",new oe(l,3)),p.setAttribute("uv",new oe(h,2)),p.setIndex(new oe(u,1)),p}function Cs(o){let s=new qo([new b(0,0,0),new b(12,.2,.3),new b(22,1,1.8),new b(28,2.4,4.4),new b(31,3,6.4)]),r=new Xo(s,60,Le.radius,o,!1),l=r.attributes.position,h=r.attributes.uv,u=new Float32Array(l.count),f=new Float32Array(l.count),t=new b;for(let p=0;p<l.count;p++){let c=h.getX(p);u[p]=c*31,f[p]=h.getY(p);let m=Math.max(0,(c-.62)/.38);s.getPointAt(Math.min(1,c),t);let y=l.getY(p)-t.y;l.setY(p,t.y+y*(1-.55*m))}return r.setAttribute("aAlong",new oe(u,1)),r.setAttribute("aAround",new oe(f,1)),r.computeVertexNormals(),{geometry:r,end:s.getPointAt(1),endDir:s.getTangentAt(1)}}function Fs(){let o=new as(42,2.1,2.1,84,2,2),e=o.attributes.position;for(let s=0;s<e.count;s++){let r=e.getY(s),l=e.getZ(s),h=Math.max(Math.abs(r),Math.abs(l));if(h>0){let u=Math.hypot(r,l),f=1.05/Math.max(u,1e-6),t=.35;e.setY(s,r*(1-t)+r*f*t*(h/1.05)),e.setZ(s,l*(1-t)+l*f*t*(h/1.05))}}return o.translate(21,0,0),o.computeVertexNormals(),o}function zs(){let o=new ss(1,1,.28,9,1),e=o.attributes.position;for(let s=0;s<e.count;s++){let r=e.getX(s),l=e.getZ(s),h=Math.atan2(l,r),u=.75+.35*Re(Math.cos(h)*1.7,Math.sin(h)*1.7,5);e.setX(s,r*u),e.setZ(s,l*u*.8),e.setY(s,e.getY(s)+.08*Re(r*2,1,l*2))}return o.computeVertexNormals(),o}var rt=512,Us=30,Rr=`
uniform sampler3D uCurl;
vec3 curl(vec3 p) { return texture(uCurl, p * 0.125).xyz; }
`,Vs=`
uniform float uTime;
uniform sampler2D uHist;       // rows: 0 emitter (xyz, alive), 1 pointer (xyz, strength), 2 pointer velocity (xyz), puff
uniform float uHistHead;       // the current slot
uniform vec3 uViewDir;         // camera forward (for the pointer's swirl axis)
uniform float uCalm;           // 1, or less when motion is reduced
${Rr}
vec4 hist(float row, float t) {
  // t: seconds ago; (the history is a ring, read with linear filtering along it)
  float slot = uHistHead - t * ${Us.toFixed(1)};
  return texture2D(uHist, vec2((mod(slot, ${rt.toFixed(1)}) + 0.5) / ${rt.toFixed(1)}, (row + 0.5) / 3.0));
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
`;function Sr(o,e){let s=o*(e+1)*2,r=new Float32Array(s),l=new Float32Array(s),h=new Float32Array(s),u=[],f=0;for(let p=0;p<o;p++){let c=p/o+.37*Math.sin(p*12.9898);for(let m=0;m<=e;m++){for(let y of[-1,1])r[f]=m/e,l[f]=y,h[f]=c,f++;if(m<e){let y=(p*(e+1)+m)*2;u.push(y,y+1,y+2,y+1,y+3,y+2)}}}let t=new tt;return t.setAttribute("aS",new oe(r,1)),t.setAttribute("aSide",new oe(l,1)),t.setAttribute("aSeed",new oe(h,1)),t.setAttribute("position",new oe(new Float32Array(s*3),3)),t.setIndex(u),t.boundingSphere=new Yo(new b,1e5),t}function _r(o){let e=new Float32Array(o*4),s=7,r=()=>(s=s*16807%2147483647)/2147483647;for(let h=0;h<o*4;h++)e[h]=r();let l=new tt;return l.setAttribute("aSeed",new oe(e,4)),l.setAttribute("position",new oe(new Float32Array(o*3),3)),l.boundingSphere=new Yo(new b,1e5),l}var Ls=`
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
`,Bs=`
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
`;function Is(o,e){let s=e,r={transparent:!0,depthTest:!1,depthWrite:!1,blending:Na,blendSrc:Io,blendDst:Oo,blendSrcAlpha:Io,blendDstAlpha:Oo},l=new ye({defines:{STEPS:o.smokeSteps,STRANDS:o.strands.toFixed(1),SEGMENTS:o.segments.toFixed(1)},uniforms:s,vertexShader:`
      attribute float aS;
      attribute float aSide;
      attribute float aSeed;
      uniform float uLife;
      uniform float uPx;         // pixels per mm at 1 mm distance (in the smoke target)
      ${Vs}
      ${Ls}
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
      ${Bs}
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
      }`,side:ro,...r}),h=new Te(Sr(o.strands,o.segments),l);h.frustumCulled=!1;let u=new ye({defines:{STEPS:Math.max(4,o.smokeSteps-4),HAZE_K:(900/o.haze).toFixed(3)},uniforms:s,vertexShader:`
      attribute vec4 aSeed;
      uniform float uHazeLife;
      uniform float uPx;
      ${Vs}
      ${Ls}
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
      ${Bs}
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
      }`,...r}),f=new ts(_r(o.haze),u);return f.frustumCulled=!1,{ribbons:h,haze:f,dispose:()=>[h.geometry,f.geometry,l,u].forEach(t=>t.dispose())}}var Eo=class{constructor(){this.data=new Uint16Array(rt*3*4),this.tex=new uo(this.data,rt,3,no,je),this.tex.wrapS=Ct,this.tex.wrapT=Ga,this.tex.magFilter=this.tex.minFilter=Ft,this.tex.needsUpdate=!0,this.slot=0,this.t=0}fill(e,s){for(let r=0;r<rt;r++)this.write(r,e,s,null,0,null);this.tex.needsUpdate=!0}write(e,s,r,l,h,u,f=0){let t=this.data,p=$a.toHalfFloat,c=e*4;t[c]=p(s[0]),t[c+1]=p(s[1]),t[c+2]=p(s[2]),t[c+3]=p(r),c=(rt+e)*4,l&&(t[c]=p(l[0]),t[c+1]=p(l[1]),t[c+2]=p(l[2])),t[c+3]=p(h),c=(2*rt+e)*4,t[c]=p(u?u[0]:0),t[c+1]=p(u?u[1]:0),t[c+2]=p(u?u[2]:0),t[c+3]=p(f)}advance(e,s,r,l,h,u,f=0){this.t+=e*Us;let t=!1;for(;this.t>=1;)this.t-=1,this.slot=(this.slot+1)%rt,this.write(this.slot,s,r,l,h,u,f),t=!0;return this.write(this.slot,s,r,l,h,u,f),(t||h>0||f>0)&&(this.tex.needsUpdate=!0),this.slot}dispose(){this.tex.dispose()}};Ye.lights_physical_pars_fragment.includes("+ 0.08 );")||(Ye.lights_physical_pars_fragment=Ye.lights_physical_pars_fragment.replaceAll("float alpha = pow2( roughness ); // UE4's roughness","float alpha = min( 1.0, pow2( roughness ) + 0.08 );"));Ye.lights_fragment_end.includes("(only the ember blooms)")||(Ye.lights_fragment_end+=`
// (only the ember blooms)
reflectedLight.directSpecular = min( reflectedLight.directSpecular, vec3( 2.2 ) );
#ifdef USE_CLEARCOAT
clearcoatSpecularDirect = min( clearcoatSpecularDirect, vec3( 2.2 ) );
#endif
`);vs();var ua={high:{name:"high",dpr:2,strands:10,segments:160,haze:1800,smokeSteps:10,smokeScale:.5,dof:!0,bloomReal:!0,bloomScale:.5,shadow:2048,msaa:4,smaa:!0,fps:60,trayH:.6,segs:64},medium:{name:"medium",dpr:1.5,strands:8,segments:120,haze:1100,smokeSteps:8,smokeScale:.5,dof:!1,bloomReal:!1,bloomScale:.35,shadow:1024,msaa:4,smaa:!0,fps:60,trayH:.75,segs:48},low:{name:"low",dpr:1,strands:6,segments:80,haze:500,smokeSteps:6,smokeScale:.25,dof:!1,bloomReal:!1,bloomScale:.25,shadow:1024,msaa:2,smaa:!1,fps:30,trayH:.9,segs:32}},Os=["high","medium","low"];function Pr(){let o=navigator,e=o.userAgent||"",s=/Android|iPhone|iPad|iPod|Mobile/i.test(e)||o.maxTouchPoints>1&&/Macintosh/.test(e),r="";try{let c=document.createElement("canvas").getContext("webgl2"),m=c&&c.getExtension("WEBGL_debug_renderer_info");r=c?String(c.getParameter(m?m.UNMASKED_RENDERER_WEBGL:c.RENDERER)):"",c?.getExtension("WEBGL_lose_context")?.loseContext()}catch{r=""}let l=o.deviceMemory||8,h=o.hardwareConcurrency||4,u=/SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(r),f=/Intel\(R\) (HD|UHD) Graphics( [2-6]\d\d)?\b|Mali-[GT][0-7]\d\b|Adreno \(TM\) [3-5]\d\d|PowerVR|Apple A(9|10|11)/i.test(r),t=s?"medium":"high";return(f||l<=4||h<=4)&&(t=s?"low":"medium"),(u||l<=2)&&(t="low"),{tier:t,mobile:s}}var Hr=`
.cg-root{position:absolute;inset:0;overflow:hidden;color:#d9d4cc;font:500 12.5px/1.4 -apple-system,BlinkMacSystemFont,Inter,'Segoe UI',Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.cg-poster{position:absolute;left:50%;top:0;height:100%;width:auto;min-width:100%;max-width:none;object-fit:cover;transform:translateX(-50%);pointer-events:none}
.cg-stage{position:absolute;inset:0;opacity:0;transition:opacity .8s ease}
.cg-ready .cg-stage{opacity:1}
.cg-lost .cg-stage,.cg-fallback .cg-stage{opacity:0}
.cg-canvas{display:block;width:100%;height:100%;touch-action:none}
.cg-ui{transition:opacity .5s}
.cg-root:not(.cg-ready) .cg-ui,.cg-fallback .cg-ui{opacity:0;pointer-events:none}
.cg-hint{position:absolute;top:max(16px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);margin:0;padding:6px 13px;border-radius:999px;color:rgba(230,224,214,.62);background:rgba(28,26,24,.42);border:1px solid rgba(255,255,255,.07);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);white-space:nowrap;pointer-events:none;letter-spacing:.02em;transition:opacity .8s;max-width:calc(100% - 32px);overflow:hidden;text-overflow:ellipsis}
.cg-hint.gone{opacity:0}
.cg-tools{position:absolute;right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));display:flex;gap:9px}
.cg-root button{font:inherit;cursor:pointer;color:inherit}
.cg-round{width:40px;height:40px;padding:0;border-radius:50%;display:grid;place-items:center;background:rgba(32,30,28,.45);border:1px solid rgba(255,255,255,.08);-webkit-backdrop-filter:blur(14px) saturate(1.3);backdrop-filter:blur(14px) saturate(1.3);box-shadow:0 4px 18px rgba(0,0,0,.35);transition:transform .15s,background .2s}
.cg-round:hover{transform:scale(1.06);background:rgba(44,42,40,.55)}
.cg-round:active{transform:scale(.94)}
.cg-round:focus-visible{outline:2px solid #e8a868;outline-offset:2px}
.cg-round svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.cg-round[aria-pressed='false'] .on,.cg-round[aria-pressed='true'] .off{display:none}
@container cg (max-width: 520px){.cg-hint{white-space:normal;text-align:center;width:max-content;border-radius:12px}}
.cg-root{container:cg/inline-size}
`,Dr=`<div class="cg-ui">
  <p class="cg-hint">drag to look around \xB7 pick up the cigarette \xB7 tap to flick ash</p>
  <div class="cg-tools">
    <button class="cg-round" data-act="sound" aria-label="Sound" aria-pressed="false" title="Sound">
      <svg class="off" viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>
      <svg class="on" viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/></svg>
    </button>
    <button class="cg-round" data-act="reset" aria-label="Reset view" title="Reset view"><svg viewBox="0 0 24 24"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/></svg></button>
  </div>
</div>`;function pn(o,e={}){let s=new URLSearchParams(location.search),r={quality:s.get("quality")||e.quality||"auto",poster:e.poster??null,debug:e.debug??s.has("debug"),workerUrl:e.workerUrl,dynres:s.get("dynres")!=="0"&&e.dynamicResolution!==!1},l=matchMedia("(prefers-reduced-motion: reduce)").matches,h=!1,u=[],f=(A,F,U,d)=>{A.addEventListener(F,U,d),u.push(()=>A.removeEventListener(F,U,d))},t={},p={destroy:O,ready:null,get quality(){return t.tier||null}},c,m=performance.now(),y=[],H=()=>globalThis.scheduler?.yield?globalThis.scheduler.yield():new Promise(A=>setTimeout(A,0)),S=()=>m=performance.now();return p.ready=N().catch(A=>{h||console.error("still life:",A),c?.classList.add("cg-fallback")}),p;async function N(){let A=performance.now(),F=a=>{let n=performance.now();y.push({step:a,ms:n-A}),A=n};getComputedStyle(o).position==="static"&&(o.style.position="relative"),c=document.createElement("div"),c.className="cg-root";let U=document.createElement("style");if(U.textContent=Hr,c.appendChild(U),r.poster){let a=document.createElement("img");a.className="cg-poster",a.alt="",a.src=r.poster,c.appendChild(a)}let d=document.createElement("div");d.className="cg-stage",c.appendChild(d),c.insertAdjacentHTML("beforeend",Dr),o.appendChild(c);let C=Pr(),M=!ua[r.quality],D={...ua[M?C.tier:r.quality]};t.tier=D.name;let E;try{E=new hs({antialias:!1,powerPreference:"high-performance"})}catch{c.classList.add("cg-fallback");return}let z=1,ne=()=>Math.min(window.devicePixelRatio||1,D.dpr);E.setPixelRatio(ne()),E.outputColorSpace=Go,E.toneMapping=ja,E.toneMappingExposure=1,E.shadowMap.enabled=!0,E.shadowMap.type=Ia,E.shadowMap.autoUpdate=!1;let Z=E.domElement;Z.className="cg-canvas",Z.setAttribute("role","img"),Z.setAttribute("aria-label","A cigarette burning in a hand-thrown stoneware ashtray on a dark walnut table, its smoke curling up through a beam of light."),d.appendChild(Z);let re=(()=>{try{return new Worker(r.workerUrl,{type:"module"})}catch{return null}})();re&&u.push(()=>re.terminate());let ie=0,ue=new Map;re&&(re.onmessage=a=>{ue.get(a.data.id)?.(a.data),ue.delete(a.data.id)});let ge=a=>re?new Promise(n=>{let i=++ie;ue.set(i,n),re.postMessage({...a,id:i})}):Promise.reject(new Error("no worker")),ve=ge({type:"tray",h:D.trayH}),P=ge({type:"bake"}),G=ge({type:"curl"}),R=new lo;R.fog=new Qa(0,.0011);let _=new is(24,1,6,5e3);function B(){let a=new lo;a.background=new pe(.006,.006,.007);let n=new Ko(1,1),i=(J,Ie,ze,ct,et)=>{let Oe=new ho({color:new pe(...et).multiplyScalar(ct),side:ro}),vt=new Te(n,Oe);return vt.scale.set(J,Ie,1),vt.position.set(...ze),vt.lookAt(0,0,0),a.add(vt),Oe},g=[i(500,2600,[-1700,1500,900],2.4,[1,.88,.76]),i(1800,260,[700,1600,-1800],.7,[.7,.8,1])],w=new cs(E),T=w.fromScene(a,0,10,6e3).texture;w.dispose(),n.dispose();for(let J of g)J.dispose();return T}F("renderer");let j=B();F("environment (PMREM)"),await H(),R.environment=j,R.environmentIntensity=.55;let ae=[0,1,2].map(a=>_s(a));function de(a,n){let i=ae[a],g=new b(-i.dir[0],0,-i.dir[2]),w=te.degToRad(4.5),T=g.clone().multiplyScalar(Math.cos(w)).add(new b(0,-Math.sin(w),0)).normalize(),J=fe.bowlTop+2.3,ct=new b(i.dir[0]*J,i.y+Le.radius+.05,i.dir[2]*J).clone().addScaledVector(T,-35),et=new b(0,1,0),Oe=new b().crossVectors(T,et).normalize(),vt=new b().crossVectors(Oe,T).normalize();return n.makeBasis(T,vt,Oe).setPosition(ct),n}let Q=(await P).tex;if(F("textures baked (worker)"),h)return;let nt=Math.min(8,E.capabilities.getMaxAnisotropy()),we=[];function Ee(a,n,i,g=!0){let w=new uo(n,a.size,a.size);return g&&(w.wrapS=w.wrapT=Ct),w.magFilter=Ft,w.minFilter=Ya,w.generateMipmaps=!0,w.anisotropy=nt,i&&(w.colorSpace=Go),w.needsUpdate=!0,we.push(w),w}let ee={walnut:Ee(Q.walnut,Q.walnut.px,!0),walnutN:Ee(Q.walnut,Q.walnut.nrm,!1),walnutR:Ee(Q.walnut,Q.walnut.rough,!1),speckle:Ee(Q.speckle,Q.speckle.px,!1),cork:Ee(Q.cork,Q.cork.px,!0),paper:Ee(Q.paper,Q.paper.px,!1),fibre:Ee(Q.fibre,Q.fibre.px,!1)},v={uTime:{value:0},uEmber:{value:1}},k=new Ne({map:ee.walnut,normalMap:ee.walnutN,roughnessMap:ee.walnutR,roughness:1,clearcoat:.22,clearcoatRoughness:.32,normalScale:new L(.6,.6)});for(let a of[ee.walnut,ee.walnutN,ee.walnutR])a.repeat.set(6,6);k.onBeforeCompile=a=>{a.vertexShader=a.vertexShader.replace("#include <common>",`#include <common>
varying vec3 vWp;`).replace("#include <worldpos_vertex>",`#include <worldpos_vertex>
vWp = (modelMatrix * vec4(transformed, 1.0)).xyz;`),a.fragmentShader=a.fragmentShader.replace("#include <common>",`#include <common>
varying vec3 vWp;`).replace("#include <fog_fragment>",`gl_FragColor.rgb *= smoothstep(470.0, 150.0, length(vWp.xz));
#include <fog_fragment>`)};let I=new Te(new Ko(2400,2400).rotateX(-Math.PI/2),k);I.receiveShadow=!0,R.add(I);let Y=new Ne({color:16777215,roughness:.6,clearcoat:1,clearcoatRoughness:.06,vertexColors:!0});Y.onBeforeCompile=a=>{a.uniforms.tSpeck={value:ee.speckle},a.uniforms.uFloor={value:fe.floor},a.vertexShader=a.vertexShader.replace("#include <common>",`#include <common>
attribute vec2 aZone;
varying vec2 vZone;
varying vec3 vOP;
varying vec3 vON;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vZone = aZone;
vOP = position;
vON = normal;`),a.fragmentShader=a.fragmentShader.replace("#include <common>",`#include <common>
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
          material.clearcoat = trayInterior * (1.0 - trayDust) * (1.0 - trayRaw);`).replace(/TRAY_BOTTOM/g,fe.bowlBottom.toFixed(1))},Y.customProgramCacheKey=()=>"tray";let W=new $o(16766638,2.8,0,.42,.95,0);W.castShadow=!0,W.shadow.mapSize.set(D.shadow,D.shadow),W.shadow.camera.near=150,W.shadow.camera.far=900,W.shadow.bias=-4e-4,W.shadow.normalBias=.6,W.shadow.radius=5,R.add(W,W.target);let $=new $o(11125503,1.4,0,.22,.6,0);R.add($,$.target);let De=new ns(2240578,788486,.09);R.add(De);for(let a of[W,$,De])a.layers.enableAll();await H();let Qe=await ve;if(F("materials; ashtray meshed (worker)"),h)return;let Se=Qe.mesh,X=new tt;X.setAttribute("position",new oe(Se.positions,3)),X.setAttribute("normal",new oe(Se.normals,3));let Ae=new Float32Array(Se.ao.length*3);for(let a=0;a<Se.ao.length;a++)Ae[a*3]=Ae[a*3+1]=Ae[a*3+2]=.45+.55*Se.ao[a];X.setAttribute("color",new oe(Ae,3)),X.setAttribute("aZone",new oe(Se.zone,2)),X.setIndex(new oe(Se.indices,1));let qe=new Te(X,Y);qe.castShadow=qe.receiveShadow=!0,R.add(qe),await H();let Ut=Hs(D.segs),Et=Ds(D.segs),Ns=As(D.segs),js=ks(),K=[0,1].map(a=>{let n=ha(ee,v);n.u.uSeed.value=.3+a*.37;let i=new zt;i.matrixAutoUpdate=!1;let g=new Te(Ut,n.body);g.castShadow=g.receiveShadow=!0,g.customDepthMaterial=n.bodyDepth,g.layers.enable(Xe.REGION);let w=new zt,T=new Te(Et,n.ember),J=new Te(Ns,n.ash);J.position.x=.7,J.castShadow=J.receiveShadow=!0;let Ie=new Te(js,n.tobacco);w.add(T,J,Ie);for(let ze of[T,J,Ie])ze.layers.set(Xe.REGION);return i.add(g,w),R.add(i),{group:i,body:g,burn:w,ember:T,ash:J,mats:n,notch:a,b:64.5,ashLen:13,fallAt:15,lit:1,fade:a===0?1:0,state:a===0?"burning":"waiting"}}),ma=new Ke;function xo(a,n){a.notch=n,de(n,ma),a.group.matrix.copy(ma),a.group.matrixWorldNeedsUpdate=!0}xo(K[0],0),xo(K[1],1),K[1].group.visible=!1;let _e=0;function fa(a){a.mats.u.uBurn.value=a.b,a.mats.u.uLit.value=a.lit,a.mats.u.uFade.value=a.fade,a.burn.position.x=a.b,a.ash.scale.x=Math.max(.001,a.ashLen/Le.ashMax),a.mats.u.uAshScale.value=a.ash.scale.x,a.ash.visible=a.ashLen>.05;let n=a.fade<.999;for(let i of[a.mats.body,a.mats.ash])i.transparent=n;a.ember.visible=a.lit>.01||a.fade>.01}F("cigarettes"),await H();let xt=ha(ee,{uTime:v.uTime,uEmber:{value:0}});xt.u.uBurn.value=29.6,xt.u.uLit.value=0;let To=Cs(D.segs),It=new Te(To.geometry,xt.body);It.customDepthMaterial=xt.bodyDepth,It.castShadow=It.receiveShadow=!0;let Tt=new Te(new Zo(3.1,3),new Ne({color:2762532,roughness:.96}));{let a=Tt.geometry.attributes.position;for(let n=0;n<a.count;n++){let i=a.getX(n),g=a.getY(n),w=a.getZ(n),T=1+.22*Re(i*.9,g*.9+2,w*.9);a.setXYZ(n,i*T*.75,g*T*.55,w*T)}Tt.geometry.computeVertexNormals(),Tt.position.copy(To.end).addScaledVector(To.endDir,-.4)}let Ot=new zt;Ot.add(It,Tt),Ot.position.set(-6,fe.floor+Le.radius-.15,16),Ot.rotation.set(0,2.55,-.05),R.add(Ot);let Mo=new Ne({color:13149562,roughness:.78});Mo.onBeforeCompile=a=>{a.vertexShader=a.vertexShader.replace("#include <common>",`#include <common>
varying float vX;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vX = position.x;`),a.fragmentShader=a.fragmentShader.replace("#include <common>",`#include <common>
varying float vX;`).replace("#include <color_fragment>",`#include <color_fragment>
float ch = smoothstep(20.0, 39.0, vX);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.008, 0.006, 0.005), ch);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.107, 0.033, 0.01), smoothstep(14.0, 20.0, vX) * (1.0 - ch) * 0.7);`)};let da=new Te(Fs(),Mo),Ro=new Zo(1.6,3);{let a=Ro.attributes.position;for(let n=0;n<a.count;n++){let i=a.getX(n),g=a.getY(n),w=a.getZ(n),T=1+.2*Re(i*1.4+3,g*1.4,w*1.4);a.setXYZ(n,i*1.35*T+42.4,g*T,w*T)}Ro.computeVertexNormals()}let So=new Te(Ro,new Ne({color:1841689,roughness:.9,sheen:.4,sheenColor:new pe(.35,.34,.33)})),Nt=new zt;Nt.add(da,So);for(let a of[da,So])a.castShadow=a.receiveShadow=!0;Nt.position.set(-21,fe.floor+1.08,-2),Nt.rotation.set(0,.42,.035),R.add(Nt),F("butt, match"),await H();let Be=48,pa=new Ne({color:7236455,roughness:.97}),Mt=new es(zs(),pa,Be);Mt.instanceMatrix.setUsage(Ka),Mt.frustumCulled=!1,R.add(Mt);for(let a of[k,Y,xt.body,Tt.material,Mo,So.material,pa,...K.flatMap(n=>[n.mats.body,n.mats.ash,n.mats.tobacco])])bs(a);let x={p:new Float32Array(Be*3),v:new Float32Array(Be*3),q:Array.from({length:Be},()=>new Ge),w:new Float32Array(Be*3),s:new Float32Array(Be),awake:new Uint8Array(Be),used:new Uint8Array(Be),next:0},ga=new Ke,_o=new b,Rt=new Ge,Po=new b,Gs=new io;function va(a){Po.set(x.p[a*3],x.p[a*3+1],x.p[a*3+2]),_o.setScalar(x.used[a]?x.s[a]:0),ga.compose(Po,x.q[a],_o),Mt.setMatrixAt(a,ga)}{let a=3,n=()=>(a=a*16807%2147483647)/2147483647;for(let i=0;i<9;i++){let g=n()*Math.PI*2,w=6+n()*20;x.p.set([Math.cos(g)*w,fe.floor+.25,Math.sin(g)*w],i*3),x.q[i].setFromEuler(new io(n()*.2,n()*6.28,n()*.2)),x.s[i]=.8+n()*1.2,x.used[i]=1}x.next=9;for(let i=0;i<Be;i++)va(i)}let Ho=.25;function Do(a,n,i,g){let w=Bt(a,n,i);g[0]=Bt(a+Ho,n,i)-w,g[1]=Bt(a,n+Ho,i)-w,g[2]=Bt(a,n,i+Ho)-w;let T=Math.hypot(g[0],g[1],g[2])||1;return g[0]/=T,g[1]/=T,g[2]/=T,w}let Pe=new Float64Array(3),St=0;function Ys(a){if(!St)return!1;St=0;for(let n=0;n<Be;n++){if(!x.awake[n])continue;let i=n*3;x.v[i+1]-=9810*.32*a;let g=Math.exp(-a*4);x.v[i]*=g,x.v[i+1]*=g,x.v[i+2]*=g,x.p[i]+=x.v[i]*a,x.p[i+1]+=x.v[i+1]*a,x.p[i+2]+=x.v[i+2]*a;let w=Do(x.p[i],x.p[i+1],x.p[i+2],Pe),T=!1;if(w<.25){let Ie=.25-w;x.p[i]+=Pe[0]*Ie,x.p[i+1]+=Pe[1]*Ie,x.p[i+2]+=Pe[2]*Ie;let ze=x.v[i]*Pe[0]+x.v[i+1]*Pe[1]+x.v[i+2]*Pe[2];ze<0&&(x.v[i]-=1.15*ze*Pe[0],x.v[i+1]-=1.15*ze*Pe[1],x.v[i+2]-=1.15*ze*Pe[2]),T=!0}x.p[i+1]<.15&&(x.p[i+1]=.15,x.v[i+1]<0&&(x.v[i+1]*=-.1),T=!0),T&&(x.v[i]*=.6,x.v[i+2]*=.6,x.w[i]*=.5,x.w[i+1]*=.5,x.w[i+2]*=.5,Rt.setFromUnitVectors(_o.set(0,1,0).applyQuaternion(x.q[n]),Po.set(Pe[0],Pe[1],Pe[2])),x.q[n].premultiply(Rt.slerp(Rt.identity(),.85))),Rt.setFromEuler(Gs.set(x.w[i]*a,x.w[i+1]*a,x.w[i+2]*a)),x.q[n].premultiply(Rt);let J=Math.abs(x.v[i])+Math.abs(x.v[i+1])+Math.abs(x.v[i+2]);T&&J<6?x.awake[n]=0:St++,va(n)}return Mt.instanceMatrix.needsUpdate=!0,!0}let jt=new b;function Ao(a,n){let i=Math.max(3,Math.round(a.ashLen*.7));for(let g=0;g<i;g++){let w=x.next;x.next=(x.next+1)%Be;let T=a.b+.5+g/i*a.ashLen;jt.set(T,(Math.random()-.5)*3,(Math.random()-.5)*3).applyMatrix4(a.group.matrix),x.p.set([jt.x,jt.y,jt.z],w*3),x.v.set([(Math.random()-.5)*60+n[0],-40-Math.random()*60+n[1],(Math.random()-.5)*60+n[2]],w*3),x.w.set([(Math.random()-.5)*12,(Math.random()-.5)*12,(Math.random()-.5)*12],w*3),x.q[w].setFromEuler(new io(Math.random()*3,Math.random()*3,Math.random()*3)),x.s[w]=.9+Math.random()*1.3,x.used[w]=1,x.awake[w]=1,St++}a.ashLen=0,a.fallAt=12+Math.random()*5}F("flakes");let Gt=(await G).curl;if(F("curl volume (worker)"),h)return;let ke=new Xa(Gt.data,Gt.size,Gt.size,Gt.size);ke.format=no,ke.type=je,ke.wrapS=ke.wrapT=ke.wrapR=Ct,ke.minFilter=ke.magFilter=Ft,ke.unpackAlignment=1,ke.needsUpdate=!0,we.push(ke);let _t=new Eo,se=new b,Ce={uTime:v.uTime,uHist:{value:_t.tex},uHistHead:{value:0},uViewDir:{value:new b},uCalm:{value:l?.35:1},uLife:{value:11},uHazeLife:{value:12},uPx:{value:500},uRimPos:{value:new b},uRimDir:{value:new b},uRimCone:{value:new L},uKeyPos:{value:new b},uCam:{value:new b},uBright:{value:1},uEmberPos:{value:new b},uEmberI:{value:1},uDepthZ:{value:null},uRes:{value:new L(1,1)},uCurl:{value:ke}},ba=Is(D,Ce);F("smoke"),await H();let Yt=new lo;Yt.add(ba.ribbons,ba.haze);function ya(a,n){return n.set(a.b+.9,0,0).applyMatrix4(a.group.matrix)}ya(K[0],se),_t.fill([se.x,se.y,se.z],1);let xe={target:new b,pos:new b};{let a=se;xe.target.set(a.x*.6,a.y+26,a.z*.6);let n=ae[0],i=Math.atan2(n.dir[2],n.dir[0])+te.degToRad(118),g=300,w=te.degToRad(15);xe.pos.set(xe.target.x+Math.cos(i)*Math.cos(w)*g,xe.target.y+Math.sin(w)*g,xe.target.z+Math.sin(i)*Math.cos(w)*g);let T=new b().subVectors(xe.target,xe.pos).setY(0).normalize(),J=new b(T.z,0,-T.x);W.position.copy(a).addScaledVector(J,270).addScaledVector(T,-140).add(new b(0,310,0)),W.target.position.set(0,10,0),$.position.copy(a).addScaledVector(T,300).addScaledVector(J,-60).add(new b(0,62,0)),$.target.position.copy(a).add(new b(0,50,0)),W.target.updateMatrixWorld(),$.target.updateMatrixWorld()}Ce.uRimPos.value.copy($.position),Ce.uRimDir.value.subVectors($.target.position,$.position).normalize(),Ce.uRimCone.value.set(Math.cos($.angle),Math.cos($.angle*(1-$.penumbra))),Ce.uKeyPos.value.copy(W.position);let me=new go(_,Z);me.enableDamping=!0,me.dampingFactor=.07,me.minDistance=70,me.maxDistance=420,me.minPolarAngle=te.degToRad(8),me.maxPolarAngle=te.degToRad(86),me.enablePan=!1,me.rotateSpeed=.6,_.position.copy(xe.pos),me.target.copy(xe.target),me.update();let ft=180,qt={key:W.intensity,rim:$.intensity,fill:De.intensity,env:R.environmentIntensity},Zt=0;function qs(a){let n=a==="static"||a==="ember"?1:a==="region"?2:0;for(let g of K)g.mats.u.uPart.value=g===K[_e]?n:0;let i=a==="ember";W.intensity=i?0:qt.key,$.intensity=i?0:qt.rim,De.intensity=i?0:qt.fill,R.environmentIntensity=i?0:qt.env,aa(se,_,a==="static"?0:i?1:Zt/ft,ft)}let Ue=gs({renderer:E,camera:_,Q:D,smokeScene:Yt,SU:Ce,setMode:qs}),le={still:!1,scene:R,emberI:0,dofK:0,regionBox:new We,emberBox:new We,smokeBox:new We,glow:{x:.5,y:.5,r:.05,col:new b},focus:{s:300,home:300},seed:0,truth:!1},Pt=new b,ce={x0:0,y0:0,x1:0,y1:0,behind:!1};function wa(){ce.x0=ce.y0=1/0,ce.x1=ce.y1=-1/0,ce.behind=!1}function Ea(a){a.project(_),(a.z>1||a.z<-1)&&(ce.behind=!0);let n=a.x*.5+.5,i=a.y*.5+.5;n<ce.x0&&(ce.x0=n),n>ce.x1&&(ce.x1=n),i<ce.y0&&(ce.y0=i),i>ce.y1&&(ce.y1=i)}let Wt=a=>Math.min(1,Math.max(0,a));function xa(a){return ce.behind?a.set(0,0,1,1):a.set(Wt(ce.x0),Wt(ce.y0),Wt(ce.x1),Wt(ce.y1))}function Ta(a,n,i,g,w){wa();for(let T=0;T<8;T++)Ea(Pt.set(T&1?i:n,T&2?g:-g-1.6,T&4?g:-g).applyMatrix4(a.group.matrix));return xa(w)}function Zs(a,n){wa();for(let i=0;i<8;i++)Ea(Pt.set(a.x+(i&1?120:-120),a.y+(i&2?260:-6),a.z+(i&4?120:-120)));return xa(n)}let ko=new pe(16738852);function Ht(){let a=Math.max(1,o.clientWidth),n=Math.max(1,o.clientHeight),i=ne()*z;_.aspect=a/n;let g=Math.tan(te.degToRad(12))*Math.min(_.aspect,1.25);_.fov=te.radToDeg(2*Math.atan(g/_.aspect)),_.updateProjectionMatrix(),E.setPixelRatio(i),E.setSize(a,n,!1),E.getDrawingBufferSize(Co),Ue.setSize(Co.x,Co.y)}let Co=new L,Ma=new ResizeObserver(Ht);Ma.observe(o),u.push(()=>Ma.disconnect()),Ht();let Ra=l?0:(Le.length-Le.filter)/300,Dt=0,dt=0,Fo=0;function Ws(a){let n=K[_e];if(n.state==="burning")n.b-=Ra*a,n.ashLen=Math.min(Le.ashMax,n.ashLen+Ra*a*.92),n.ashLen>n.fallAt&&Ao(n,[0,0,0]),n.b<=Le.filter+.8&&(n.state="out",Fo=0);else if(n.state==="out"&&(Fo+=a,n.lit=Math.max(0,n.lit-a/1.6),Fo>3.5)){let i=K[1-_e];xo(i,(n.notch+1)%3),i.b=Le.length-2.5,i.ashLen=1.2,i.lit=1,i.fade=0,i.state="arriving",i.group.visible=!0,n.state="leaving",it.held&&it.drop(),_e=1-_e,be.reset(i),Fe=!0}for(let i of[0,1]){let g=K[i];g.state==="arriving"?(g.fade=Math.min(1,g.fade+a/1.6),g.fade>=1&&(g.state="burning"),Fe=!0):g.state==="leaving"&&(g.fade=Math.max(0,g.fade-a/1.6),g.fade<=0&&(g.state="waiting",g.group.visible=!1),Fe=!0),g.group.visible&&fa(g)}}let V={x:0,y:0,inside:!1,world:new b,prev:new b,vel:new b,strength:0,has:!1},zo=new mo;zo.layers.enableAll();let Sa=new L,_a=new yt,Kt=new b;function Ks(a,n,i){let g=Z.getBoundingClientRect();return Sa.set((a-g.left)/g.width*2-1,-((n-g.top)/g.height)*2+1),zo.setFromCamera(Sa,_),_.getWorldDirection(Kt),Kt.y=0,Kt.normalize(),_a.setFromNormalAndCoplanarPoint(Kt,se),zo.ray.intersectPlane(_a,i)}let Xt={passive:!0};f(Z,"pointermove",a=>{S(),V.x=a.clientX,V.y=a.clientY,V.inside=!0},Xt),f(Z,"pointerleave",()=>V.inside=!1,Xt);let Qt=[0,0,0],$t=[0,0,0],Jt=[0,0,0];function Xs(a){if(V.inside&&Ks(V.x,V.y,V.world)){V.has?(V.vel.subVectors(V.world,V.prev).divideScalar(Math.max(a,.001)),V.vel.length()>1500&&V.vel.setLength(1500)):V.vel.set(0,0,0),V.prev.copy(V.world),V.has=!0;let n=Math.min(1,V.vel.length()/350);V.strength+=(Math.max(n,V.strength*Math.exp(-a/1.2))-V.strength)*Math.min(1,a*8)}else V.has=!1,V.strength*=Math.exp(-a/1.2),V.vel.multiplyScalar(Math.exp(-a/.6))}f(Z,"wheel",S,Xt),f(window,"keydown",S),f(Z,"pointerdown",()=>{S(),ka(),gt()},Xt);function Pa(a){let n=[0,0,0];a.ashLen>.3&&Ao(a,n),dt=1,Dt=1,$e.burst(1),t.lastFlick=performance.now()}let Ha=ae.map(a=>new b(a.dir[0]*(fe.bowlTop+2.3),a.y+Le.radius+.05,a.dir[2]*(fe.bowlTop+2.3))),it=ws({canvas:Z,camera:_,controls:me,listen:f,onActive:()=>(S(),ka(),gt())}),be=Ts({camera:_,sdfGrad:Do,notchPose:(a,n)=>de(a,n),notchSeat:a=>Ha[a],onBreak:(a,n)=>{Ao(a,[n.x*.7,n.y*.7,n.z*.7]),Dt=1,dt=Math.max(dt,.6),$e.burst(.8)},onChange:()=>Fe=!0});be.reset(K[0]);for(let a of K)it.add({meshes:[a.body,a.ash,a.ember],canGrab:()=>a===K[_e]&&(a.state==="burning"||a.state==="out")&&be.st.mode!=="glide",pick:n=>{be.pick(a,n.point),t.lastPick=performance.now()},aim:n=>be.aim(n),twist:n=>be.twist(n),release:()=>a.state==="leaving"||a.state==="waiting"?null:be.release(),home:()=>be.glideTo(a.notch),cancel:()=>be.cancel(),onTap:()=>{a.state==="burning"&&Pa(a)}});let Da=new b,$e={ctx:null,on:!1,buf:null,t:0,enable(a){if(this.on=a,a&&!this.ctx){let n=window.AudioContext||window.webkitAudioContext;if(!n)return;this.ctx=new n;let i=this.ctx.sampleRate;this.buf=this.ctx.createBuffer(1,i,i);let g=this.buf.getChannelData(0);for(let w=0;w<i;w++)g[w]=Math.random()*2-1}this.ctx&&(a&&At?this.ctx.resume():this.ctx.suspend())},burst(a){if(!this.on||!this.ctx||this.ctx.state!=="running")return;let n=this.ctx,i=n.createBufferSource();i.buffer=this.buf;let g=n.createBiquadFilter();g.type="bandpass",g.frequency.value=2200+Math.random()*4500,g.Q.value=.8;let w=n.createGain(),T=n.currentTime,J=(.015+Math.random()*.04)*a;w.gain.setValueAtTime(0,T),w.gain.linearRampToValueAtTime(J,T+.002),w.gain.exponentialRampToValueAtTime(1e-4,T+.02+Math.random()*.05),i.connect(g).connect(w).connect(n.destination),i.start(T,Math.random()*.9,.09)},step(a){!this.on||!this.ctx||(this.t-=a,this.t<=0&&(this.t=.04+Math.random()*.22,K[_e].state==="burning"&&this.burst(.5+Math.random()*.5)))},close(){this.ctx?.close()}};u.push(()=>$e.close());let Qs=c.querySelector(".cg-hint"),Aa=!0;function ka(){Aa&&(Aa=!1,setTimeout(()=>Qs.classList.add("gone"),2500))}let He={on:!1};function $s(){it.held?it.drop("home"):(be.st.mode==="lying"||be.st.mode==="fall")&&be.glideTo(K[_e].notch),He.on=!0,He.t0=performance.now(),He.ms=l?1:1100,He.p0=_.position.clone(),He.q0=me.target.clone(),me.enableDamping=!1}function Js(a){if(!He.on)return;let n=Math.min(1,(a-He.t0)/He.ms),i=n<.5?4*n*n*n:1-Math.pow(-2*n+2,3)/2;_.position.lerpVectors(He.p0,xe.pos,i),me.target.lerpVectors(He.q0,xe.target,i),n>=1&&(He.on=!1,me.enableDamping=!0)}for(let a of c.querySelectorAll("[data-act]"))f(a,"click",()=>{if(S(),a.dataset.act==="reset")$s();else if(a.dataset.act==="sound"){let n=a.getAttribute("aria-pressed")!=="true";a.setAttribute("aria-pressed",String(n)),$e.enable(n)}gt()});let At=!0,eo=!0,lt=0,to=performance.now(),Ca=0,Fe=!0,Vo=0,oo=0,Fa=!1,za=1e3/D.fps,Je={sum:0,n:0,good:0},Va=!0,ao=0,La=0,Lo=0,Bo=new Ke,Uo=new Ke,Ba=(a,n)=>{for(let i=0;i<16;i++)if(Math.abs(a.elements[i]-n.elements[i])>1e-5*Math.max(1,Math.abs(a.elements[i])))return!1;return!0},er=9e3,pt={emberLight:1,cache:1,truth:0,freeze:0},Ze=null;r.debug&&import("./ember-overlay-OPFBF3FI.js").then(a=>{h||(Ze=a.createOverlay(c,E,()=>({tier:t.tier,scale:z,targets:Ue.targets.length+(D.bloomReal?11:0)+2}),y),t.firstFrameAt&&(Ze.stats.firstFrameAt=t.firstFrameAt,Ze.report()))});function gt(){!lt&&At&&Fa&&!h&&(lt=requestAnimationFrame(so))}let tr=a=>.82+.1*Math.sin(a*1.3)+.07*Re(a*2.7,.5,.5)+.05*Re(a*9,3.1,.2);function so(a){if(lt=0,!At||h)return;let n=a-m>er&&!He.on;if((D.fps<60||n)&&a-Ca<1e3/30-2){lt=requestAnimationFrame(so);return}let i=performance.now(),g=Math.min(.05,(a-to)/1e3);to=a,pt.freeze&&(g=0),Ca=a,oo+=g*(l?.35:1),v.uTime.value=oo,Js(a),me.update(),it.hover();let w=be.update(g,K[_e].state==="burning");Ws(g),Ys(g),Xs(g),$e.step(g),Dt=Math.max(0,Dt-g/1.1),dt=Math.max(0,dt-g/2.2);let T=K[_e];v.uEmber.value=tr(oo)+.9*Dt+.7*be.st.fan,Da.copy(se),ya(T,se),be.st.mode==="held"&&g>0&&(V.world.copy(se),V.vel.subVectors(se,Da).divideScalar(g),V.vel.length()>1500&&V.vel.setLength(1500),V.strength=Math.max(V.strength*Math.exp(-g/1.2),Math.min(1,V.vel.length()/350))),Zt=ft*v.uEmber.value*T.lit*T.fade*pt.emberLight,_.updateMatrixWorld(),aa(se,_,Zt/ft,ft),Jt[0]=se.x,Jt[1]=se.y,Jt[2]=se.z,Qt[0]=V.world.x,Qt[1]=V.world.y,Qt[2]=V.world.z,$t[0]=V.vel.x,$t[1]=V.vel.y,$t[2]=V.vel.z;let J=T.state==="leaving"||T.state==="waiting"?0:T.lit*T.fade;Ce.uHistHead.value=_t.advance(g,Jt,J,Qt,V.strength,$t,dt),Ce.uEmberPos.value.copy(se),Ce.uEmberI.value=v.uEmber.value*J,_.getWorldDirection(Ce.uViewDir.value),Ce.uCam.value.copy(_.position),_.updateMatrixWorld();let Ie=Va||!Ba(Bo,_.matrixWorld)||!Ba(Uo,_.projectionMatrix);Va=!1,w&&(Fe=!0);let ze=w||Ie||He.on||St>0||K.some(Oe=>Oe.state==="arriving"||Oe.state==="leaving")||!pt.cache;Lo=ze?0:Lo+1;let ct=ze||Lo<4;Vo+=g,La+=g;let et=Vo>2;if(et&&(Vo=0),le.focus.s=_.position.distanceTo(se),le.focus.home=xe.pos.distanceTo(se),Ze?.begin(),ct?(ao=0,Ue.valid=!1,Bo.copy(_.matrixWorld),Uo.copy(_.projectionMatrix),(Fe||et)&&(E.shadowMap.needsUpdate=!0,Fe=!1)):((!Ue.valid||Fe||et)&&(Ue.bake(R,le.focus,Fe||et||!Ue.valid),Bo.copy(_.matrixWorld),Uo.copy(_.projectionMatrix),Fe=!1,La=0,Ze&&Ze.bakes++),ao=Math.min(1,ao+g/.4)),le.still=!ct,le.truth=!!pt.truth,le.emberI=Zt/ft,le.dofK=ao,pt.freeze||(le.seed=(le.seed+.6180339)%7),Ta(T,T.b-4.6,T.b+.7+T.ashLen+.8,4.7,le.regionBox),Ta(T,T.b-1.2,T.b+3.8,4.7,le.emberBox),Zs(se,le.smokeBox),D.bloomReal||(Pt.copy(se).project(_),le.glow.x=Pt.x*.5+.5,le.glow.y=Pt.y*.5+.5,le.glow.r=7/(2*le.focus.s*Math.tan(te.degToRad(_.fov/2))),le.glow.col.set(ko.r,ko.g,ko.b).multiplyScalar(.3*le.emberI)),Ue.render(le),Ze?.end(performance.now()-i,ct?"full":"cached"),r.dynres&&(Je.sum+=g*1e3,++Je.n>=45)){let Oe=Je.sum/Je.n;Je.sum=Je.n=0,Oe>za*1.2&&z>.6?(z=z>.9?.85:z>.8?.72:.6,Ht()):Oe<za*1.05&&z<1&&++Je.good>=6&&(z=z<.65?.72:z<.8?.85:1,Je.good=0,Ht())}gt()}function kt(a){a!==At&&(At=a,a?(to=performance.now(),$e.enable($e.on),gt()):(lt&&cancelAnimationFrame(lt),lt=0,$e.ctx?.suspend()))}let Ua=new IntersectionObserver(a=>{eo=a[a.length-1].isIntersecting,kt(eo&&!document.hidden)});Ua.observe(o),u.push(()=>Ua.disconnect()),f(document,"visibilitychange",()=>kt(eo&&!document.hidden)),f(Z,"webglcontextlost",a=>{a.preventDefault(),kt(!1),c.classList.add("cg-lost")}),f(Z,"webglcontextrestored",()=>{j.dispose(),j=B(),R.environment=j,Fe=!0,_t.tex.needsUpdate=!0,ke.needsUpdate=!0,Ue.valid=!1,c.classList.remove("cg-lost"),kt(eo&&!document.hidden)});for(let a of K)fa(a);let or=performance.now();if(K[1].group.visible=!0,F("post, controls, sound, loop"),await H(),_.layers.enableAll(),await E.compileAsync(R,_),_.layers.set(0),await E.compileAsync(Yt,_),K[1].group.visible=!1,!h){if(E.shadowMap.needsUpdate=!0,so(performance.now()),await H(),so(performance.now()),t.compileMs=performance.now()-or,F("shaders compiled, first frame"),t.firstFrameAt=performance.now(),c.classList.add("cg-ready"),Fa=!0,to=performance.now(),gt(),M){let a=performance.now(),n=0;await new Promise(w=>{let T=()=>{n++,performance.now()-a>1600||h?w():requestAnimationFrame(T)};requestAnimationFrame(T)});let i=(performance.now()-a)/Math.max(1,n),g=Os.indexOf(t.tier);if(i>1e3/60*1.35&&g<2){let w=ua[Os[g+1]];t.tier=w.name,D.dpr=w.dpr,D.fps=w.fps,D.smokeScale=w.smokeScale,D.bloomScale=w.bloomScale,D.dof=w.dof,D.bloomReal=D.bloomReal&&w.bloomReal,D.smaa=w.smaa,Ht()}}r.debug&&(window.__still={THREE:ot,scene:R,camera:_,renderer:E,controls:me,cigs:K,api:t,handle:p,flick:()=>Pa(K[_e]),emberWorld:se,ptr:V,SU:Ce,frameCache:Ue,Q:D,key:W,rim:$,fill:De,tableMat:k,trayMat:Y,flags:pt,homePos:xe.pos,homeTarget:xe.target,pickup:be,grab:it,seatPts:Ha,traySdfGrad:Do,get cur(){return K[_e]},setTime:a=>oo=a,burnTo:a=>{K[_e].b=a,Ue.valid=!1,Fe=!0},get overlay(){return Ze}}),t.dispose=()=>{kt(!1),me.dispose();let a=new Set;for(let n of[R,Yt])n.traverse(i=>{i.geometry&&!a.has(i.geometry)&&a.add(i.geometry)&&i.geometry.dispose();let g=Array.isArray(i.material)?i.material:i.material?[i.material]:[];for(let w of g)a.has(w)||a.add(w)&&w.dispose()});for(let n of we)n.dispose();_t.dispose(),j.dispose(),W.shadow.dispose(),Ue.dispose(),E.dispose(),E.forceContextLoss(),Ze?.dispose()}}}function O(){if(!h){h=!0;try{t.dispose?.()}finally{for(let A of u.splice(0))A();c?.remove(),window.__still?.handle===p&&delete window.__still}}}}export{ua as TIERS,pn as createScene,Pr as guessTier};
