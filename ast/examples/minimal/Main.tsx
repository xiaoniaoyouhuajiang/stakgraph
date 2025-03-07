// @ts-ignore
import React, { useState } from "react";
// @ts-ignore
import Thumbnail from "./Thumbnail";
// @ts-ignore
import LikeButton from "./LikeButton";
// @ts-ignore
import * as api from "./api";
import { say_hi } from "./utils";

const TribesURL = "";

let arrow = () => {};

export class MainStore {
  blah = () => {};
  asdf = function () {};

  async makeBountyPayment(body: {
    id: number;
    websocket_token: string;
  }): Promise<any> {
    try {
      const r: any = await fetch(`${TribesURL}/gobounties/pay/${body.id}`, {
        method: "POST",
        mode: "cors",
        body: JSON.stringify(body),
      });
      return r;
    } catch (e) {
      console.log("Error makeBountyPayment", e);
      return false;
    }
  }
}

export default function Video({ video }) {
  const [hi, setHi] = useState("hi");
  const makePayment = async () => {
    // hi
    getSomething();
    say_hi();
  };
  async function getSomething() {
    const r = await api.get("https://jsonplaceholder.typicode.com/todos/1");
  }
  return (
    <div>
      <Thumbnail video={video} />
      <a href={video.url}>
        <h3>{video.title}</h3>
        <p>{video.description}</p>
        <p>{hi}</p>
      </a>
      <LikeButton video={video} onClick={() => setHi("lo")} />
    </div>
  );
}
