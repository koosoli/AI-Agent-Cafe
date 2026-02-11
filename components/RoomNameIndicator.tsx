import React from 'react';

interface RoomNameIndicatorProps {
  roomName: string;
}

const RoomNameIndicator = ({ roomName }: RoomNameIndicatorProps) => {
  return (
    <div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 room-announcer-animation pointer-events-none z-[1000]"
    >
      <div
        className="bg-black/70 text-white text-2xl md:text-3xl px-6 py-2 border-2 border-black"
        style={{
          textShadow: '2px 2px #000',
          boxShadow: '4px 4px 0px black'
        }}
      >
        {roomName}
      </div>
    </div>
  );
};

export default RoomNameIndicator;