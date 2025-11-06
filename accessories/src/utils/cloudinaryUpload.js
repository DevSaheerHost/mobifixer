export default async function uploadImage(file) {
  const cloudName = "saheerbabu";
  const uploadPreset = "accessories";

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const res = await fetch(url, { method: "POST", body: formData });
  const data = await res.json();

  return data.secure_url;
}