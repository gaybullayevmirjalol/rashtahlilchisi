'use client';

import React from 'react';
import Image from 'next/image';
import { Building } from 'lucide-react';
import type { Test, Student } from '@/types';

export interface PrintableOMRSheetProps {
  test?: Test | null;
  student?: Student | null;
  groupName?: string;
  date: string;
  qrCodeDataUrl: string;
  logoUrl?: string | null;
}

const AnswerBubble = () => (
  <div className="w-5 h-5 border border-black rounded-full flex-shrink-0"></div>
);

const AnswerColumnHeader = () => (
    <div className="flex items-center gap-[18px] ml-[30px] mb-1">
        <span className="w-5 text-center text-xs font-sans font-bold text-black">A</span>
        <span className="w-5 text-center text-xs font-sans font-bold text-black">B</span>
        <span className="w-5 text-center text-xs font-sans font-bold text-black">C</span>
        <span className="w-5 text-center text-xs font-sans font-bold text-black">D</span>
        <span className="w-5 text-center text-xs font-sans font-bold text-black">E</span>
    </div>
);


const AnswerRow = ({ questionNumber }: { questionNumber: string }) => (
  <div className="flex items-center gap-2">
    <span className="text-sm font-semibold w-6 text-right text-black">{questionNumber}.</span>
    <div className="flex items-center gap-2.5">
      <AnswerBubble />
      <AnswerBubble />
      <AnswerBubble />
      <AnswerBubble />
      <AnswerBubble />
    </div>
  </div>
);

export function PrintableOMRSheet({
  test,
  student,
  groupName,
  date,
  qrCodeDataUrl,
  logoUrl,
}: PrintableOMRSheetProps) {
  const questions = test?.questions || [];
  const questionCount = questions.length;
  
  // A4 portrait layout can comfortably fit ~35 questions per column.
  const questionsPerColumn = 35;
  const numColumns = Math.ceil(questionCount / questionsPerColumn);
  
  // Create an array of arrays, where each inner array is a column of questions.
  const columns = Array.from({ length: numColumns }, (_, colIndex) => {
    const start = colIndex * questionsPerColumn;
    const end = Math.min(start + questionsPerColumn, questionCount);
    return questions.slice(start, end);
  });

  return (
    <div className="w-full h-full bg-white flex items-center justify-center p-4 text-black font-sans">
      <div className="w-full h-full border-2 border-dashed border-gray-300 p-3 flex flex-col">
        {/* Header Section */}
        <header className="flex justify-between items-center pb-2 border-b-2 border-dashed">
          <div className="w-20 h-20 bg-gray-100 flex items-center justify-center rounded border flex-shrink-0">
            {logoUrl ? (
              <Image src={logoUrl} alt="Logo" width={80} height={80} className="object-contain" />
            ) : (
              <div className="text-center text-gray-400">
                <Building className="h-6 w-6 mx-auto" />
                <p className="text-[10px] mt-1">Markaz Logotipi</p>
              </div>
            )}
          </div>

          <div className="flex-grow text-center px-2">
              <h2 className="font-bold text-sm uppercase">{test?.subjectName || "Noma'lum Fan"}</h2>
              <p className="font-bold text-lg mt-1 leading-tight">
                {test?.name || "Noma'lum Test"}
              </p>
               <p className="font-bold text-xl mt-1 leading-tight">
                {student?.name || "Talaba Ismi Familiyasi"}
              </p>
              <div className='flex justify-center gap-x-4'>
                <p className="text-xs mt-1">
                  Guruh: <span className="font-semibold">{groupName || "Noma'lum"}</span>
                </p>
                <p className="text-xs mt-1">
                  Sana: <span className="font-semibold">{date}</span>
                </p>
              </div>
          </div>

          <div className="flex flex-col items-center justify-center flex-shrink-0">
            <Image src={qrCodeDataUrl} alt="QR Code" width={100} height={100} />
            <p className="text-[9px] text-center mt-1 text-gray-600 max-w-[100px]">
              Testni tekshirish uchun QR kod
            </p>
          </div>
        </header>

        {/* Answer Grid Section */}
        <div className="flex-grow pt-2 flex flex-row justify-around gap-x-4">
            {columns.map((columnQuestions, colIndex) => (
                <div key={colIndex} className="flex flex-col gap-1">
                    <AnswerColumnHeader />
                    {columnQuestions.map((question) => (
                        <AnswerRow key={question.id} questionNumber={question.id} />
                    ))}
                </div>
            ))}
        </div>

        {/* Footer Section */}
        <footer className="text-center text-xs text-gray-400 pt-2 border-t border-dashed mt-auto">
          <p>RashExam Tahlilchisi tomonidan yaratildi</p>
        </footer>
      </div>
    </div>
  );
}
