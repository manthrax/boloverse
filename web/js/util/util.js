
export default {
        DLL:function(link)
        {
            return{
                link:link,
                free:null,
                used:null,
                store:[],
                usedCount:0,
                freeCount:0,
                add: function(obj){
                    if(this.freeCount==0){  //No free nodes
                        var nd={prev:null,next:this.used,obj:obj};
                        this.store.push(nd);    //push a node on the store, linked to the used list
                        if(this.used!=null)this.used.prev=nd;
                        obj[this.link]=this.used=nd;
                        this.usedCount++;      //set the node pointer in the obj and set the used list to point to the new node..
                    }else{
                        var elem=this.free;
                        this.free=elem.next;
                        elem.prev=null;
                        if(this.used!=null)
                            this.used.prev=elem;
                        elem.next=this.used;
                        this.used=elem;
                        this.freeCount--;
                        this.usedCount++;
                        elem.obj=obj;
                        obj[this.link]=elem;
                    }
                },
                rmv: function(obj){
                    var e=obj[link];
                    if(e.prev==null)this.used=e.next;
                    else e.prev.next= e.next;
                    if(e.next!=null)e.next.prev=e.prev;
                    e.prev=null;
                    e.next=this.free;
                    this.free=e;
                    e.obj=null;
                    obj[this.link]=null;
                    this.usedCount--;
                    this.freeCount++;
                }
            }
        },
        testDLL: function(){
            var tlist=this.DLL("testList");
            var tobjs=[];
            var ect=1000;
            var incount=ect;
            for(var t=0;t<ect;t++){
                var obj={name:"mo"+t};
                tobjs.push(obj);
                tlist.add(obj);
            }
            for(var iter=0;iter<1000;iter++){
                for(t=0;t<ect;t++){
                    if(tobjs[t][tlist.link]!=null){
                        if(Math.random()<0.5){
                            tlist.rmv(tobjs[t]);
                            incount--;
                        }
                    }else{
                        if(Math.random()<0.5){
                            tlist.add(tobjs[t]);
                            incount++;
                        }
                    }
                }
            }
            var str="";
            for(var n=tlist.used;n!=null;n=n.next)str+="   "+(n.prev?n.prev.obj.name+"<":"[")+n.obj.name+(n.next?">"+n.next.obj.name:"]");
            console.log(str);
            console.log("list:"+tlist.link+" u:"+tlist.usedCount+" f:"+tlist.freeCount+" fs:"+tlist.store.length);
            console.log("expected u:"+incount+" f:"+(ect-incount));
        },
        ObjectPool:function(allocator)
        {
            return{
                allocator: allocator,
                freeList:null,
                activeList:null,
                pendingList:null,
                byId:{},
                inIterator:false,
                iterCount:0,
                updateSum:0,
                add:function(elem){
                    elem.next=this.pendingList;
                    this.pendingList=elem;
                },
                allocate:function(){
                    var e=this.freeList;
                    if(e!=null){
                        this.freeList=e.next;
                    }else{
                        e=allocator();                
                    }
                    this.add(e);
                    return e;
                },
                iterator:function(list,next,func,dtor){
                    return{
                        elem:this[list],
                        prv:null,
                        list:list,
                        next:next,
                        func:func,
                        dtor:dtor,
                        iterate:function(){
                            if(this.elem==null)return null;
                            if(this.elem.active==true)
                                this.func(this.elem);
                            if(this.elem.active==false){
                                var nxt=this.elem[next];
                                if(this.dtor)
                                    this.dtor(this.elem);
                                if(this.prv==null)this[list]=nxt;
                                else this.prv[next]=nxt;
                                this.elem=nxt;
                            }else{
                                this.prv=this.elem;
                                this.elem=this.elem[this.next];
                            }
                        }
                    }
                },
                iterateList:function (list,next,func,dtor){
                    var elem=this[list];
                    var prv=null;
                    while(elem!=null){
                        if(elem.active)
                            updater.update(elem);
                        if(elem.active==false){
                            var nxt=elem[next];
                            
                            if(dtor)
                                dtor(elem);
                            if(prv==null)this[list]=nxt;
                            else prv[next]=nxt;
                            elem=nxt;
                        }else{
                            prv=elem;
                            elem=elem[next];
                        }
                    }                    
                },
                addPending:function(){
                    if(this.pendingList==null)return;
                    var elem=this.pendingList;  //Add newly added objects...
                    while(elem!=null){
                        var e=elem;
                        elem=elem.next;                        
                        e.next=this.activeList;
                        this.activeList=e;
                        e.active=true;
                        if(e.id)
                            this.byId[e.id]=e;
                    }
                    this.pendingList=null;                    
                },
                iterateActive:function (updater){
                    var upct=0;
                    this.addPending();
                    var elem=this.activeList;
                    var prv=null;
                    while(elem!=null){
                        if(elem.active){
                            updater.update(elem);
                            upct++;
                        }
                        if(elem.active==false){
                            var nxt=elem.next;
                            if(elem.id) delete this.byId[elem.id];
                            //elem.next=this.freeList;
                            //this.freeList=elem;
                            if(elem.destroy)
                                elem.destroy();
                            if(prv==null)this.activeList=nxt;
                            else prv.next=nxt;
                            elem=nxt;
                        }else{
                            prv=elem;
                            elem=elem.next;
                        }
                    }
                    this.addPending();
                    this.updateSum+=upct;
                    this.iterCount++;
                }
            }
        }
    }
    
