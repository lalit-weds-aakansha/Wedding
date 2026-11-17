// The tests and calibration scripts use the server's own face module, so they exercise the real model and preprocessing.
export { detectFaces, cropFace, euclid, loadModels, analysePhoto, analyseSelfie } from "../../server/faces.js";
