import {GLTFExporter} from "three/addons/exporters/GLTFExporter.js"

export default async function saveGLB(scene, name) {
    const exporter = new GLTFExporter();
    // Trigger the export with binary option set to true
    exporter.parse(scene, function(glb) {
        saveArrayBuffer(glb, name);
    },function(err){
        console.log("export error:",err)
    },
    {
        binary: true
    });
    // Utility function to save the GLB as a file
    function saveArrayBuffer(buffer, filename) {
        const blob = new Blob([buffer],{
            type: 'application/octet-stream'
        });
        const anchor = document.createElement('a');
        anchor.download = filename;
        anchor.href = URL.createObjectURL(blob);
        anchor.click();
        URL.revokeObjectURL(anchor.href);
    }
}
