import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import "./App.css";
import { epub2Image } from "./Epub2Image";

interface FileInfos {
  file: File;
  blobURL?: string;
  message: string;
}

function App() {
  const [files, setFiles] = useState<FileInfos[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFileInfos = acceptedFiles.map((file) => ({ file, message: "" }));
    setFiles((prevFiles) => [...prevFiles, ...newFileInfos]);
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const onDownload = async (fileInfo: FileInfos) => {
    if (!fileInfo.blobURL) {
      fileInfo.message = "Processing...";
      setFiles([...files]);
      const blobURL = await epub2Image(fileInfo.file);
      fileInfo.blobURL = blobURL || undefined;
    }

    if (fileInfo.blobURL) {
      const a = document.createElement("a");
      a.href = fileInfo.blobURL;
      a.download = fileInfo.file.name + "_images.zip";
      a.click();

      fileInfo.message = "Success";
      setFiles([...files]);
    } else {
      fileInfo.message = "Failed";
      setFiles([...files]);
    }
  };

  return (
    <div className="container">
      <a href="https://github.com/TonyLeung47/orderd-epub-image-ts">Github</a>
      <h1>Epub Image</h1>
      <div className="dropzone" {...getRootProps()}>
        <input {...getInputProps()} />
        {isDragActive ? <p>Drop the files here ...</p> : <p>Drag 'n' drop epub files here, or click to select files</p>}
      </div>
      <div className="grid">
        {files.map((fileInfo, index) => (
          <>
            <div key={index}>{fileInfo.file.name}</div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={() => setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index))}>×</button>
              <button onClick={() => onDownload(fileInfo)}>Download</button>
              <div style={{ color: "red" }}>{fileInfo.message}</div>
            </div>
          </>
        ))}
      </div>
    </div>
  );
}

export default App;
