
define( function() {


    return {
        ObjectPool:function(allocator)
        {
            return{
                allocator: allocator,
                freeList:null,
                activeList:null,
                pendingList:null,
                byId:{},
                inIterator:false,
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
                    this.addPending();
                    var elem=this.activeList;
                    var prv=null;
                    while(elem!=null){
                        if(elem.active)
                            updater.update(elem);
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
                }
            }
        }
    }
});
