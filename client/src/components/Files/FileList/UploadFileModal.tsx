import React, { useState, ChangeEvent } from 'react';
import { Button, OGDialog, OGDialogContent, OGDialogHeader, OGDialogTitle, Input } from '@hanzochat/client';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

const UploadFileModal = ({ open, onOpenChange }) => {
  const localize = useLocalize();
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
    }
  };

  return (
    <OGDialog open={open} onOpenChange={onOpenChange}>
      <OGDialogContent
        className={cn(
          'w-11/12 overflow-x-auto p-3 shadow-2xl dark:bg-gray-700 dark:text-white lg:w-2/3 xl:w-2/5',
        )}
      >
        <OGDialogHeader>
          <OGDialogTitle className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-200">
            Upoad a File
          </OGDialogTitle>
        </OGDialogHeader>
        <div className="flex w-full flex-col p-0 sm:p-6 sm:pb-0 sm:pt-4">
          <div className="flex w-full flex-row">
            <div className="hidden w-1/5 sm:block">
              <img />
            </div>
            <div className="flex w-full flex-col text-center sm:w-4/5 sm:text-left">
              <div className="italic">Please upload square file, size less than 100KB</div>
              <div className="mt-4 flex w-full flex-row items-center bg-surface-secondary p-2">
                <div className="w-1/2 sm:w-1/3">
                  <Button>Choose File</Button>
                </div>
                <div className="w-1/2 sm:w-1/3"> No File Chosen</div>
              </div>
            </div>
          </div>
          <div className="mt-3 flex w-full flex-col">
            <label htmlFor="name">Name</label>
            <label className="hidden text-[#808080] sm:block">The name of the uploaded file</label>
            <Input type="text" id="name" name="name" placeholder="Name" />
          </div>

          <div className="mt-3 flex w-full flex-col">
            <label htmlFor="purpose">Purpose</label>
            <label className="hidden text-[#808080] sm:block">
              The purpose of the uploaded file
            </label>
            <Input type="text" id="purpose" name="purpose" placeholder="Purpose" />
          </div>

          <div className="mt-3 flex w-full flex-row justify-between">
            <div className="hidden w-1/3 sm:block">
              <span className="font-bold">Learn about file purpose</span>
            </div>
            <div className="flex w-full flex-row justify-evenly sm:w-1/3">
              <Button
                className="mr-3 w-full rounded-md border border-border-medium bg-transparent p-0 text-text-primary hover:bg-surface-hover"
                onClick={() => {
                  onOpenChange(false);
                }}
              >
                Cancel
              </Button>
              <Button
                className="w-full rounded-md border border-black bg-black p-0 text-white"
                onClick={() => {
                  console.log('upload file');
                }}
              >
                Upload
              </Button>
            </div>
          </div>
        </div>
      </OGDialogContent>
    </OGDialog>
  );
};

export default UploadFileModal;
