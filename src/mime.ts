import { Mime } from "mime";

import standardTypes from 'mime/types/standard.js';
import otherTypes from 'mime/types/other.js';

const mime = new Mime(standardTypes, otherTypes);

mime.define({
    "audio/mpeg": ["mp3"], // RPE不认识.mpga
    "audio/flac": ["flac"],
    "audio/x-flac": ["flac"],
    "audio/ogg": ["ogg", "oga"],
    "audio/mp4": ["m4a", "mp4"],
    "audio/aac": ["aac"],
    "audio/opus": ["opus"],
    "audio/webm": ["webm"],
    "audio/x-wav": ["wav"],
    "audio/wav": ["wav"],
}, true)

export default mime;
