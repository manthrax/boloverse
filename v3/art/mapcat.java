import java.io.*;
import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.List;
import java.util.Scanner;

public class mapcat {
	static void log(Object str){
		System.out.println(str.toString());
	}
  /** Read the given binary file, and return its contents as a byte array.*/ 
  static byte[] read(String aInputFileName){
	//log("Reading in binary file named : " + aInputFileName);
	File file = new File(aInputFileName);
	//log("File size: " + file.length());
	byte[] result = new byte[(int)file.length()];
	try {
	  InputStream input = null;
	  try {
		int totalBytesRead = 0;
		input = new BufferedInputStream(new FileInputStream(file));
		while(totalBytesRead < result.length){
		  int bytesRemaining = result.length - totalBytesRead;
		  //input.read() returns -1, 0, or more :
		  int bytesRead = input.read(result, totalBytesRead, bytesRemaining); 
		  if (bytesRead > 0){
			totalBytesRead = totalBytesRead + bytesRead;
		  }
		}
		/*
		 the above style is a bit tricky: it places bytes into the 'result' array; 
		 'result' is an output parameter;
		 the while loop usually has a single iteration only.
		*/
		//log("Num bytes read: " + totalBytesRead);
	  }
	  finally {
		//log("Closing input stream.");
		if(input!=null)input.close();
	  }
	}
	catch (FileNotFoundException ex) {
	  log("File not found."+aInputFileName);
	  return null;
	}
	catch (IOException ex) {
	  log(ex);
	  return null;
	}
	return result;
  }
  
  /**
   Write a byte array to the given file. 
   Writing binary data is significantly simpler than reading it. 
  */
  static void write(byte[] aInput, String aOutputFileName){
	//log("Writing binary file...");
	try {
	  OutputStream output = null;
	  try {
		output = new BufferedOutputStream(new FileOutputStream(aOutputFileName));
		output.write(aInput);
	  }
	  finally {
		output.close();
	  }
	}
	catch(FileNotFoundException ex){
	  log("File not found.");
	}
	catch(IOException ex){
	  log(ex);
	}
  }
  
  final static Charset ENCODING = StandardCharsets.UTF_8;
  
    public static void main(String[] args){
		// Open the file that is the first 
		// command line parameter
		
		Path path = Paths.get(args[0]);
		try{
			FileInputStream fis = new FileInputStream(args[0]); 
			List<String> lines=Files.readAllLines(path, ENCODING);
			String outstring="define(function(){return{\n";
			for(int i=0;i<lines.size();i++){
				String fn=lines.get(i);
				byte[] bytes=read("txtmaps/"+fn+".txt");
				if(bytes!=null&&bytes.length>8)
					outstring+="\""+fn.substring(0,fn.length()-4)+"\":\""+new String(bytes)+"\",\n";
			}
			outstring+="}})\n";
			//log(outstring);
			

			PrintStream out = null;
			try {
				out = new PrintStream(new FileOutputStream("mapcat.js"));
				out.print(outstring);
			}
			finally {
				if (out != null) out.close();
			}
		}
		catch(IOException ex){
			log(ex.toString());
		}
		finally{
		}
/*		
		byte[] bytes=read(args[0]);
		byte[] obytes=new byte[bytes.length*2];
		int w=0;
		String hex="0123456789abcdef";
		try{
			byte[] hbytes=hex.getBytes("US-ASCII");
			for(int i=0;i<bytes.length;i++){
				byte b=bytes[i];
				obytes[w++]=hbytes[(b>>4)&15];
				obytes[w++]=hbytes[b&15];
			}
			write(obytes,args[0]+".txt");
		}catch(UnsupportedEncodingException e){
			log("FAIL bad getbytes on hex string!");
		}
*/
    }
}