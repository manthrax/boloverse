<?php
	session_start();

	$maps_directory = dirname($_SERVER['SCRIPT_FILENAME']) . DIRECTORY_SEPARATOR;
/*	$_GET['filename'] = preg_replace('=(\.\.|/)=', '', $_GET['filename']);

	if (!isset($_GET['filename']) || !file_exists($filename = ($maps_directory . $_GET['filename']))) {
		die(json_encode(array("error"=>"Bad Filename")));
	}*/

	$data = array("mapname" => substr($filename, 0, -4), "map" => array());

	$mapfiles = glob("*.map");

	$_SESSION['mapRandom'] = false;

	if (!isset($_SESSION['mapFilename']) ||
	    !$_SESSION['mapFilename'][0] || 
	    !file_exists($filename = ($maps_directory . $_SESSION['mapFilename']))) {
		$filename = $mapfiles[rand(0, count($mapfiles)-1)];
		$_SESSION['mapRandom'] = true;
		$data['message'] = "Chose random map ({$filename}).";
	}

	$_SESSION['mapFilename'] = basename($filename);

	$fp = fopen($filename, 'rb');

	$x = 1;
	$y = 0;

	while (!feof($fp)) {
		$c = fread($fp, 1);
		$num = unpack('C', $c);
		$data['map'][] = $num[1];
	}

	fclose($fp);

	// for some reason the last element
	// of the map array is null.. ????
	array_pop($data['map']);

	echo json_encode($data);
?>
