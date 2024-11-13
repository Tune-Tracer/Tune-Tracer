import * as d3 from "d3";
import React from "react";

import { OnlineEntity } from "../../lib/src/realtimeUserTypes";
import { SelectedNote } from "../../lib/src/SelectedNote";

type Cursor = {
  userId: string;
  color: string;
  displayName: string;
};

export function updateSelectedNote(
  userId: string,
  color: string,
  noteID?: string | undefined
) {
  const className = `user-${userId}-cursor`;
  const noteName = noteID !== undefined ? `[id="${noteID}"]` : undefined;

  // remove previous cursor
  d3.selectAll(`.${className}`).each(function () {
    d3.select(this).style("fill", null);
    d3.select(this).classed(`${className}`, false);
  });

  // add new cursor
  if (noteName) {
    const noteHeadElement = d3.select(`${noteName}`);
    if (!noteHeadElement.empty()) {
      noteHeadElement.style("fill", color).classed(`${className}`, true);
    } else {
      console.warn(`userId= Notehead with ID ${noteName} not found`);
    }
  }
}

export function processOnlineUsersUpdate(
  selfUserId: string | undefined,
  onlineUsers: Map<string, OnlineEntity>,
  userList: React.MutableRefObject<Cursor[]>
) {
  // Iterate over onlineUsers
  onlineUsers.forEach((onlineEntity, user_id) => {
    // Exclude the current user
    if (user_id === selfUserId) {
      return;
    }

    const cursor = onlineEntity.cursor as SelectedNote;
    if (cursor?.color) {
      const filteredUserList = userList.current.filter(
        (user) => user.userId === user_id
      );
      let previousUser =
        filteredUserList.length > 0 ? filteredUserList[0] : undefined;
      if (previousUser === undefined) {
        userList.current.push({
          userId: user_id,
          displayName: onlineEntity.display_name,
          color: cursor.color,
        });
        previousUser = userList.current.at(-1) as Cursor;
      }

      updateSelectedNote(user_id, cursor.color, cursor.noteID);
    }
  });
}